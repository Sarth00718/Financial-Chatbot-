"""
Document Processing Service
Handles PDF, Excel, and CSV processing, text extraction, and image analysis
Strategy: OCR → Groq LLM → Groq Vision → Gemini Vision (fallback)
"""

import os
import base64
import requests
import pymupdf as fitz  # PyMuPDF for PDF processing
import pandas as pd  # For Excel and CSV processing
from typing import List, Optional, Tuple
from io import BytesIO
from PIL import Image
import cv2
import numpy as np
from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_groq import ChatGroq
from langchain_core.messages import HumanMessage

from app.config.settings import settings
from app.services.vector_store import vector_store

# OCR imports
try:
    import pytesseract
    TESSERACT_AVAILABLE = True
except ImportError:
    TESSERACT_AVAILABLE = False
    print("[WARNING] Tesseract OCR not available")

try:
    import easyocr
    EASYOCR_AVAILABLE = True
except ImportError:
    EASYOCR_AVAILABLE = False
    print("[WARNING] EasyOCR not available")


# Constants for image processing
MAX_IMAGE_SIZE = 5 * 1024 * 1024  # 5MB max per image
MAX_IMAGE_DIMENSION = 4096  # Max width/height
SUPPORTED_IMAGE_FORMATS = ['jpeg', 'jpg', 'png', 'gif', 'bmp', 'webp']


class DocumentProcessor:
    """
    Processes documents for RAG (Retrieval Augmented Generation)
    Extracts text and analyzes images using multi-modal AI
    Strategy: Groq Vision (fast) → Gemini Vision (fallback for complex images)
    """
    
    def __init__(self):
        """Initialize document processor with text splitter, OCR, and vision models"""
        # Validate API keys
        if not settings.GROQ_API_KEY and not settings.GOOGLE_API_KEY:
            raise ValueError(
                "At least one API key (GROQ_API_KEY or GOOGLE_API_KEY) must be set. "
                "Get Groq key from: https://console.groq.com/keys "
                "Get Gemini key from: https://makersuite.google.com/app/apikey"
            )
        
        # Text splitter for chunking documents
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=settings.CHUNK_SIZE,
            chunk_overlap=settings.CHUNK_OVERLAP
        )
        
        # Initialize OCR (Primary for images)
        self.ocr_reader = None
        if EASYOCR_AVAILABLE:
            try:
                self.ocr_reader = easyocr.Reader(['en'], gpu=False)
                print("[OK] EasyOCR initialized (Primary image processing)")
            except Exception as e:
                print(f"[WARNING] Failed to initialize EasyOCR: {e}")
        
        # Initialize Groq LLM (for OCR text analysis)
        self.groq_llm = None
        if settings.GROQ_API_KEY:
            try:
                self.groq_llm = ChatGroq(
                    model=settings.GROQ_LLM_MODEL,
                    api_key=settings.GROQ_API_KEY,
                    temperature=0.0
                )
                print("[OK] Groq LLM initialized (OCR text analysis)")
            except Exception as e:
                print(f"[WARNING] Failed to initialize Groq LLM: {e}")
        
        # Initialize Groq Vision (Secondary)
        self.groq_vision = None
        if settings.GROQ_API_KEY:
            try:
                self.groq_vision = ChatGroq(
                    model=settings.GROQ_VISION_MODEL,
                    api_key=settings.GROQ_API_KEY,
                    temperature=0.0
                )
                print("[OK] Groq Vision initialized (Secondary image processing)")
            except Exception as e:
                print(f"[WARNING] Failed to initialize Groq Vision: {e}")
        
        # Initialize Gemini Vision (Final Fallback)
        self.gemini_vision = None
        if settings.GOOGLE_API_KEY:
            try:
                self.gemini_vision = ChatGoogleGenerativeAI(
                    model=settings.GEMINI_VISION_MODEL,
                    google_api_key=settings.GOOGLE_API_KEY,
                    temperature=0.0
                )
                print("[OK] Gemini Vision initialized (Final fallback)")
            except Exception as e:
                print(f"[WARNING] Failed to initialize Gemini Vision: {e}")
        
        if not self.groq_llm and not self.groq_vision and not self.gemini_vision:
            raise RuntimeError("Failed to initialize any AI model")
    
    def _extract_text_with_ocr(self, image_bytes: bytes) -> Optional[str]:
        """
        Extract text from image using OCR (EasyOCR or Tesseract)
        
        Args:
            image_bytes: Raw image data
            
        Returns:
            Extracted text or None if no text found
        """
        try:
            # Convert bytes to numpy array for OCR
            nparr = np.frombuffer(image_bytes, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            if img is None:
                return None
            
            # Try EasyOCR first (more accurate)
            if self.ocr_reader:
                try:
                    results = self.ocr_reader.readtext(img)
                    if results:
                        # Extract text from results (format: [(bbox, text, confidence), ...])
                        text_parts = [text for (bbox, text, conf) in results if conf > 0.3]
                        if text_parts:
                            extracted_text = " ".join(text_parts)
                            print(f"  [OCR] EasyOCR extracted {len(extracted_text)} chars")
                            return extracted_text
                except Exception as e:
                    print(f"  [WARNING] EasyOCR failed: {e}")
            
            # Fallback to Tesseract
            if TESSERACT_AVAILABLE:
                try:
                    # Convert to PIL Image for Tesseract
                    pil_img = Image.fromarray(cv2.cvtColor(img, cv2.COLOR_BGR2RGB))
                    text = pytesseract.image_to_string(pil_img)
                    if text and text.strip():
                        print(f"  [OCR] Tesseract extracted {len(text)} chars")
                        return text.strip()
                except Exception as e:
                    print(f"  [WARNING] Tesseract failed: {e}")
            
            return None
            
        except Exception as e:
            print(f"  [ERROR] OCR extraction failed: {e}")
            return None
    
    def _analyze_ocr_text_with_groq(self, ocr_text: str) -> Optional[str]:
        """
        Analyze OCR-extracted text using Groq LLM
        
        Args:
            ocr_text: Text extracted from image via OCR
            
        Returns:
            Analyzed description or None if failed
        """
        if not self.groq_llm or not ocr_text:
            return None
        
        try:
            prompt = (
                f"The following text was extracted from a financial document image using OCR. "
                f"Analyze and summarize the key information, focusing on:\n"
                f"- Financial data (numbers, amounts, percentages)\n"
                f"- Tables or structured data\n"
                f"- Key insights or trends\n"
                f"- Important dates or periods\n\n"
                f"OCR Text:\n{ocr_text}\n\n"
                f"Provide a clear, structured summary:"
            )
            
            response = self.groq_llm.invoke(prompt)
            if response and response.content:
                print(f"  [GROQ LLM] Analyzed OCR text ({len(response.content)} chars)")
                return response.content
            
            return None
            
        except Exception as e:
            print(f"  [ERROR] Groq LLM analysis failed: {e}")
            return None
    
    def _validate_and_optimize_image(self, image_bytes: bytes, image_format: str) -> Optional[tuple[bytes, str]]:
        """
        Validate and optimize image before processing
        
        Args:
            image_bytes: Raw image data
            image_format: Image format (e.g., 'jpeg', 'png')
            
        Returns:
            Tuple of (optimized_bytes, mime_type) or None if invalid
        """
        try:
            # Check image size
            if len(image_bytes) > MAX_IMAGE_SIZE:
                print(f"  [WARNING] Image too large ({len(image_bytes)} bytes), compressing...")
                
                # Open image with PIL
                img = Image.open(BytesIO(image_bytes))
                
                # Resize if too large
                if img.width > MAX_IMAGE_DIMENSION or img.height > MAX_IMAGE_DIMENSION:
                    ratio = min(MAX_IMAGE_DIMENSION / img.width, MAX_IMAGE_DIMENSION / img.height)
                    new_size = (int(img.width * ratio), int(img.height * ratio))
                    img = img.resize(new_size, Image.Resampling.LANCZOS)
                
                # Convert to RGB if necessary
                if img.mode not in ('RGB', 'L'):
                    img = img.convert('RGB')
                
                # Save to bytes with compression
                output = BytesIO()
                img.save(output, format='JPEG', quality=85, optimize=True)
                image_bytes = output.getvalue()
                image_format = 'jpeg'
                
                print(f"  [OK] Image compressed to {len(image_bytes)} bytes")
            
            # Determine MIME type
            format_lower = image_format.lower()
            if format_lower in ['jpg', 'jpeg']:
                mime_type = 'image/jpeg'
            elif format_lower == 'png':
                mime_type = 'image/png'
            elif format_lower == 'gif':
                mime_type = 'image/gif'
            elif format_lower == 'webp':
                mime_type = 'image/webp'
            else:
                mime_type = 'image/jpeg'  # Default fallback
            
            return image_bytes, mime_type
            
        except Exception as e:
            print(f"  [ERROR] Error validating/optimizing image: {e}")
            return None
    
    def _get_image_description(
        self, 
        image_bytes: bytes, 
        image_format: str = 'jpeg',
        use_fallback: bool = False
    ) -> Tuple[str, str]:
        """
        Analyze image using OCR-first strategy with AI fallbacks
        
        Strategy (Cost-optimized):
        1. Try OCR (EasyOCR/Tesseract) - FREE, fast
        2. If OCR succeeds → Analyze with Groq LLM - CHEAP, fast
        3. If OCR fails → Try Groq Vision - MODERATE cost
        4. If Groq Vision fails → Use Gemini Vision - HIGHER cost (final fallback)
        
        Args:
            image_bytes: Raw image data
            image_format: Image format (e.g., 'jpeg', 'png')
            use_fallback: Force skip to vision models
            
        Returns:
            Tuple of (description, model_used)
        """
        # Validate and optimize image
        result = self._validate_and_optimize_image(image_bytes, image_format)
        if not result:
            return "Image could not be processed (invalid format or too large).", "None"
        
        image_bytes, mime_type = result
        
        # STEP 1: Try OCR first (unless fallback forced)
        if not use_fallback:
            print("  [STEP 1] Trying OCR extraction...")
            ocr_text = self._extract_text_with_ocr(image_bytes)
            
            if ocr_text and len(ocr_text.strip()) > 20:  # Meaningful text found
                print(f"  [OCR SUCCESS] Extracted {len(ocr_text)} chars")
                
                # STEP 2: Analyze OCR text with Groq LLM (cheap and fast)
                print("  [STEP 2] Analyzing OCR text with Groq LLM...")
                analysis = self._analyze_ocr_text_with_groq(ocr_text)
                
                if analysis:
                    print(f"  [SUCCESS] OCR + Groq LLM pipeline completed")
                    return analysis, "OCR+GroqLLM"
                else:
                    print("  [INFO] Groq LLM analysis failed, falling back to vision models")
            else:
                print("  [INFO] OCR found no meaningful text, trying vision models")
        
        # Prepare image for vision models
        b64_image = base64.b64encode(image_bytes).decode('utf-8')
        vision_prompt = (
            "Describe this financial chart, table, or image from a document in detail. "
            "Focus on key data, trends, numbers, and conclusions. "
            "If it's a table, extract the key values. "
            "If it's a chart, describe the trends and data points. "
            "Be factual and objective."
        )
        
        message = HumanMessage(
            content=[
                {"type": "text", "text": vision_prompt},
                {"type": "image_url", "image_url": f"data:{mime_type};base64,{b64_image}"}
            ]
        )
        
        # STEP 3: Try Groq Vision
        if self.groq_vision:
            try:
                print("  [STEP 3] Trying Groq Vision...")
                response = self.groq_vision.invoke([message])
                description = response.content if response.content else ""
                
                # Check confidence
                low_confidence_indicators = [
                    "unclear", "difficult to read", "cannot determine",
                    "not visible", "blurry", "unable to", "hard to see"
                ]
                
                if description and not any(ind in description.lower() for ind in low_confidence_indicators):
                    print(f"  [SUCCESS] Groq Vision succeeded ({len(description)} chars)")
                    return description, "GroqVision"
                else:
                    print("  [INFO] Groq Vision confidence low, trying Gemini...")
                    
            except Exception as e:
                print(f"  [INFO] Groq Vision failed: {e}, trying Gemini...")
        
        # STEP 4: Use Gemini Vision (final fallback)
        if self.gemini_vision:
            try:
                print("  [STEP 4] Using Gemini Vision (final fallback)...")
                response = self.gemini_vision.invoke([message])
                description = response.content if response.content else "Could not describe image."
                print(f"  [SUCCESS] Gemini Vision succeeded ({len(description)} chars)")
                return description, "GeminiVision"
                
            except Exception as e:
                print(f"  [ERROR] Gemini Vision failed: {e}")
                return f"Image description unavailable (all methods failed).", "None"
        
        return "No vision model available.", "None"
    
    def _extract_text_from_page(self, page, page_num: int) -> List[Document]:
        """
        Extract and chunk text from a PDF page
        
        Args:
            page: PyMuPDF page object
            page_num: Page number (1-indexed)
            
        Returns:
            List of Document chunks with metadata
        """
        # Extract text from page
        text = page.get_text("text")
        
        if not text.strip():
            return []
        
        # Split text into chunks
        chunks = self.text_splitter.create_documents(
            [text],
            metadatas=[{
                "page": page_num,
                "type": "text",
                "source": "pdf_text"
            }]
        )
        
        print(f"  [TEXT] Extracted {len(chunks)} text chunks from page {page_num}")
        return chunks
    
    def _extract_images_from_page(self, doc, page, page_num: int) -> List[Document]:
        """
        Extract and analyze images from a PDF page
        
        Args:
            doc: PyMuPDF document object
            page: PyMuPDF page object
            page_num: Page number (1-indexed)
            
        Returns:
            List of Document chunks containing image descriptions
        """
        image_chunks = []
        
        # Get all images on the page
        images = page.get_images(full=True)
        
        if not images:
            return []
        
        print(f"  [IMAGE] Found {len(images)} images on page {page_num}")
        
        processed_count = 0
        skipped_count = 0
        
        for img_index, img in enumerate(images):
            try:
                # Extract image data
                xref = img[0]
                base_image = doc.extract_image(xref)
                image_bytes = base_image["image"]
                image_ext = base_image.get("ext", "jpeg")  # Get actual format
                
                # Skip very small images (likely icons or decorations)
                if len(image_bytes) < 1024:  # Less than 1KB
                    print(f"  [SKIP] Image {img_index} too small ({len(image_bytes)} bytes), likely decorative")
                    skipped_count += 1
                    continue
                
                # Get AI description of the image with format info
                description, model_used = self._get_image_description(image_bytes, image_ext)
                
                # Skip if description indicates failure
                if "unavailable" in description.lower() or "could not" in description.lower():
                    print(f"  [SKIP] Image {img_index} description failed")
                    skipped_count += 1
                    continue
                
                # Create context-aware description
                full_description = (
                    f"[Image {img_index + 1} from page {page_num}] (Analyzed by {model_used}): {description}"
                )
                
                # Create document chunk for the image description
                image_chunk = self.text_splitter.create_documents(
                    [full_description],
                    metadatas=[{
                        "page": page_num,
                        "type": "image",
                        "source": "pdf_image",
                        "image_index": img_index,
                        "image_format": image_ext
                    }]
                )
                
                image_chunks.extend(image_chunk)
                processed_count += 1
                
            except Exception as e:
                print(f"  [WARNING] Error processing image {img_index} on page {page_num}: {e}")
                skipped_count += 1
                continue
        
        print(f"  [IMAGE] Processed {processed_count} images, skipped {skipped_count}")
        return image_chunks
    
    def process_pdf(self, file_path: str) -> List[Document]:
        """
        Process a PDF file and extract all content
        
        Args:
            file_path: Path to the PDF file
            
        Returns:
            List of Document chunks (text + image descriptions)
        """
        try:
            print(f"\n[PDF] Processing PDF: {file_path}")
            
            # Verify file exists
            if not os.path.exists(file_path):
                raise FileNotFoundError(f"File not found: {file_path}")
            
            # Verify file is readable
            if not os.access(file_path, os.R_OK):
                raise PermissionError(f"File not readable: {file_path}")
            
            # Open PDF
            doc = fitz.open(file_path)
            print(f"[PDF] PDF has {len(doc)} pages")
            
            if len(doc) == 0:
                raise ValueError("PDF has no pages")
            
            all_chunks = []
            text_chunk_count = 0
            image_chunk_count = 0
            
            # Process each page
            for page_num, page in enumerate(doc, start=1):
                print(f"\n  Processing page {page_num}/{len(doc)}...")
                
                # Extract text chunks
                text_chunks = self._extract_text_from_page(page, page_num)
                all_chunks.extend(text_chunks)
                text_chunk_count += len(text_chunks)
                
                # Extract and analyze images
                image_chunks = self._extract_images_from_page(doc, page, page_num)
                all_chunks.extend(image_chunks)
                image_chunk_count += len(image_chunks)
            
            # Close document
            doc.close()
            
            if not all_chunks:
                raise ValueError("No content extracted from PDF (no text or images found)")
            
            print(f"\n[OK] PDF processing complete:")
            print(f"  - Total chunks: {len(all_chunks)}")
            print(f"  - Text chunks: {text_chunk_count}")
            print(f"  - Image chunks: {image_chunk_count}")
            
            return all_chunks
            
        except Exception as e:
            print(f"\n[ERROR] Error processing PDF: {e}")
            raise
    
    def process_excel(self, file_path: str) -> List[Document]:
        """
        Process an Excel file and extract all content
        
        Args:
            file_path: Path to the Excel file (.xlsx, .xls)
            
        Returns:
            List of Document chunks
        """
        try:
            print(f"\n[EXCEL] Processing Excel: {file_path}")
            
            # Verify file exists
            if not os.path.exists(file_path):
                raise FileNotFoundError(f"File not found: {file_path}")
            
            # Read Excel file (all sheets)
            excel_file = pd.ExcelFile(file_path)
            print(f"[EXCEL] Found {len(excel_file.sheet_names)} sheets")
            
            all_chunks = []
            
            # Process each sheet
            for sheet_num, sheet_name in enumerate(excel_file.sheet_names, start=1):
                print(f"\n  Processing sheet {sheet_num}/{len(excel_file.sheet_names)}: {sheet_name}")
                
                # Read sheet
                df = pd.read_excel(file_path, sheet_name=sheet_name)
                
                # Skip empty sheets
                if df.empty:
                    print(f"  [SKIP] Sheet '{sheet_name}' is empty")
                    continue
                
                # Convert DataFrame to text representation
                sheet_text = self._dataframe_to_text(df, sheet_name)
                
                # Create chunks
                chunks = self.text_splitter.create_documents(
                    [sheet_text],
                    metadatas=[{
                        "sheet": sheet_name,
                        "sheet_number": sheet_num,
                        "type": "excel",
                        "source": "excel_sheet",
                        "rows": len(df),
                        "columns": len(df.columns)
                    }]
                )
                
                all_chunks.extend(chunks)
                print(f"  [OK] Extracted {len(chunks)} chunks from sheet '{sheet_name}'")
            
            if not all_chunks:
                raise ValueError("No content extracted from Excel file (all sheets empty)")
            
            print(f"\n[OK] Excel processing complete:")
            print(f"  - Total chunks: {len(all_chunks)}")
            print(f"  - Sheets processed: {len(excel_file.sheet_names)}")
            
            return all_chunks
            
        except Exception as e:
            print(f"\n[ERROR] Error processing Excel: {e}")
            raise
    
    def process_csv(self, file_path: str) -> List[Document]:
        """
        Process a CSV file and extract all content
        
        Args:
            file_path: Path to the CSV file
            
        Returns:
            List of Document chunks
        """
        try:
            print(f"\n[CSV] Processing CSV: {file_path}")
            
            # Verify file exists
            if not os.path.exists(file_path):
                raise FileNotFoundError(f"File not found: {file_path}")
            
            # Try different encodings
            encodings = ['utf-8', 'latin-1', 'iso-8859-1', 'cp1252']
            df = None
            
            for encoding in encodings:
                try:
                    df = pd.read_csv(file_path, encoding=encoding)
                    print(f"[CSV] Successfully read with {encoding} encoding")
                    break
                except UnicodeDecodeError:
                    continue
            
            if df is None:
                raise ValueError("Could not read CSV file with any supported encoding")
            
            # Skip empty CSV
            if df.empty:
                raise ValueError("CSV file is empty")
            
            print(f"[CSV] Found {len(df)} rows and {len(df.columns)} columns")
            
            # Convert DataFrame to text representation
            csv_text = self._dataframe_to_text(df, "CSV Data")
            
            # Create chunks
            chunks = self.text_splitter.create_documents(
                [csv_text],
                metadatas=[{
                    "type": "csv",
                    "source": "csv_file",
                    "rows": len(df),
                    "columns": len(df.columns)
                }]
            )
            
            print(f"\n[OK] CSV processing complete:")
            print(f"  - Total chunks: {len(chunks)}")
            print(f"  - Rows: {len(df)}")
            print(f"  - Columns: {len(df.columns)}")
            
            return chunks
            
        except Exception as e:
            print(f"\n[ERROR] Error processing CSV: {e}")
            raise
    
    def _dataframe_to_text(self, df: pd.DataFrame, name: str) -> str:
        """
        Convert a pandas DataFrame to a readable text format
        
        Args:
            df: pandas DataFrame
            name: Name of the sheet/file
            
        Returns:
            Formatted text representation
        """
        text_parts = []
        
        # Add header
        text_parts.append(f"=== {name} ===\n")
        text_parts.append(f"Total Rows: {len(df)}, Total Columns: {len(df.columns)}\n\n")
        
        # Add column names
        text_parts.append("Columns: " + ", ".join(df.columns.astype(str)) + "\n\n")
        
        # Add summary statistics for numeric columns
        numeric_cols = df.select_dtypes(include=[np.number]).columns
        if len(numeric_cols) > 0:
            text_parts.append("=== Summary Statistics ===\n")
            summary = df[numeric_cols].describe()
            text_parts.append(summary.to_string() + "\n\n")
        
        # Add first few rows as sample
        text_parts.append("=== Sample Data (First 10 Rows) ===\n")
        text_parts.append(df.head(10).to_string(index=True) + "\n\n")
        
        # Add data in row format for better searchability
        text_parts.append("=== Detailed Data ===\n")
        for idx, row in df.iterrows():
            row_text = f"Row {idx + 1}: "
            row_items = []
            for col in df.columns:
                value = row[col]
                if pd.notna(value):  # Skip NaN values
                    row_items.append(f"{col}={value}")
            row_text += ", ".join(row_items)
            text_parts.append(row_text + "\n")
            
            # Limit to prevent extremely large text
            if idx >= 1000:
                text_parts.append(f"\n... (showing first 1000 rows out of {len(df)} total rows)\n")
                break
        
        return "".join(text_parts)
    
    def process_document_pipeline(
        self,
        document_id: str,
        file_path: str,
        file_name: str,
        vector_namespace: str
    ) -> None:
        """
        Complete document processing pipeline
        1. Detect file type and extract content
        2. Create embeddings
        3. Store in vector database
        4. Notify Node.js backend
        
        Args:
            document_id: MongoDB document ID
            file_path: Local path to the file
            file_name: Original filename
            vector_namespace: Unique namespace for vector storage
        """
        try:
            print(f"\n{'='*60}")
            print(f"[PIPELINE] Starting document processing pipeline")
            print(f"Document ID: {document_id}")
            print(f"File: {file_name}")
            print(f"Namespace: {vector_namespace}")
            print(f"{'='*60}")
            
            # Detect file type from extension
            file_ext = os.path.splitext(file_name)[1].lower()
            
            # Step 1: Process document based on file type
            if file_ext == '.pdf':
                chunks = self.process_pdf(file_path)
            elif file_ext in ['.xlsx', '.xls']:
                chunks = self.process_excel(file_path)
            elif file_ext == '.csv':
                chunks = self.process_csv(file_path)
            else:
                raise ValueError(f"Unsupported file type: {file_ext}. Supported types: .pdf, .xlsx, .xls, .csv")
            
            # Step 2: Create vector store
            print(f"\n[VECTOR] Creating vector embeddings...")
            vector_store.create_vector_store(chunks, vector_namespace)
            
            # Step 3: Notify Node.js backend of success
            print(f"\n[WEBHOOK] Notifying Node.js backend...")
            webhook_url = f"{settings.NODE_WEBHOOK_URL}/api/v1/documents/{document_id}/status"
            response = requests.patch(
                webhook_url,
                json={"status": "processed"},
                timeout=10
            )
            
            if response.status_code == 200:
                print(f"[OK] Webhook notification sent successfully")
            else:
                print(f"[WARNING] Webhook returned status {response.status_code}")
            
            print(f"\n{'='*60}")
            print(f"[OK] Document processing completed successfully!")
            print(f"{'='*60}\n")
            
        except Exception as e:
            print(f"\n{'='*60}")
            print(f"[ERROR] Document processing failed: {e}")
            print(f"{'='*60}\n")
            
            # Notify Node.js backend of failure
            try:
                webhook_url = f"{settings.NODE_WEBHOOK_URL}/api/v1/documents/{document_id}/status"
                requests.patch(
                    webhook_url,
                    json={
                        "status": "failed",
                        "errorMessage": str(e)
                    },
                    timeout=10
                )
                print("[WEBHOOK] Failure notification sent to Node.js backend")
            except Exception as webhook_error:
                print(f"[WARNING] Failed to send webhook notification: {webhook_error}")


# Create global document processor instance
document_processor = DocumentProcessor()
