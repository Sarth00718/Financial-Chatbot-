"""
Document Processing Service
Handles PDF processing with multi-layer extraction:
  Layer 1: PyMuPDF native text extraction (fast, reliable for digital PDFs)
  Layer 2: pdfplumber text + table extraction (handles complex layouts)
  Layer 3: OCR via pytesseract for scanned/image-only pages
  Layer 4: Vision model descriptions for charts and embedded images

Works correctly for:
  - Digital PDFs with selectable text
  - Scanned/photographed PDFs (OCR fallback)
  - Image-heavy financial reports with charts and tables
  - Mixed-content PDFs (text + images + tables)
"""

import os
import requests
import io
import pymupdf as fitz  # PyMuPDF
from typing import List, Optional
from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage
import base64

from app.config.settings import settings
from app.services.vector_store import vector_store
from app.services.ocr_service import ocr_service

# Optional imports with graceful fallbacks
try:
    import pdfplumber
    PDFPLUMBER_AVAILABLE = True
except ImportError:
    PDFPLUMBER_AVAILABLE = False
    print("[WARNING] pdfplumber not installed — table extraction via pdfplumber disabled")




class DocumentProcessor:
    """
    Multi-layer document processing pipeline for financial PDFs.
    Handles scanned PDFs, image-heavy reports, and complex table layouts.
    """

    def __init__(self):
        """Initialize processor with text splitter and optional vision model"""
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=settings.CHUNK_SIZE,
            chunk_overlap=settings.CHUNK_OVERLAP,
        )

        # Enable vision model via Groq's OpenAI-compatible endpoint
        try:
            self.vision_llm = ChatOpenAI(
                model=settings.VISION_MODEL,
                base_url="https://api.groq.com/openai/v1",
                api_key=settings.GROQ_API_KEY,
                temperature=0.1,
                max_tokens=500
            )
            self.vision_enabled = True
        except Exception as e:
            from app.config.logger import logger
            logger.error(f"Failed to initialize vision model: {e}")
            self.vision_llm = None
            self.vision_enabled = False

    # ------------------------------------------------------------------
    # LAYER 4: Vision model — chart/image description
    # ------------------------------------------------------------------

    def _describe_image_bytes(self, image_bytes: bytes, context: str = "") -> str:
        """
        Uses the Groq vision model via ChatOpenAI to describe the image/chart.
        """
        if not self.vision_enabled or not self.vision_llm:
            return "[Image/chart present — vision model disabled]"
            
        try:
            b64_img = base64.b64encode(image_bytes).decode("utf-8")
            
            prompt = "Describe the contents of this image. If it is a chart, extract the key data points."
            if context:
                prompt += f"\nContext surrounding the image: {context}"
                
            msg = HumanMessage(
                content=[
                    {"type": "text", "text": prompt},
                    {
                        "type": "image_url",
                        "image_url": {"url": f"data:image/jpeg;base64,{b64_img}"}
                    }
                ]
            )
            
            response = self.vision_llm.invoke([msg])
            return f"[VISION DESCRIPTION: {response.content.strip()}]"
            
        except Exception as e:
            from app.config.logger import logger
            logger.error(f"Vision model failed to describe image: {e}")
            return f"[Image/chart present — vision failed: {e}]"

    # ------------------------------------------------------------------
    # LAYER 1: PyMuPDF native text extraction
    # ------------------------------------------------------------------

    def _extract_pymupdf_text(self, page) -> str:
        """Extract text using multiple PyMuPDF strategies."""
        # Strategy 1: plain text
        text = page.get_text("text").strip()
        if len(text) >= 50:
            return text

        # Strategy 2: blocks (preserves reading order better)
        try:
            blocks = page.get_text("blocks")
            block_text = "\n".join(b[4] for b in blocks if len(b) > 4 and str(b[4]).strip())
            if len(block_text.strip()) >= 50:
                return block_text.strip()
        except Exception:
            pass

        # Strategy 3: dict (most granular — span-level)
        try:
            d = page.get_text("dict")
            spans = []
            for block in d.get("blocks", []):
                for line in block.get("lines", []):
                    for span in line.get("spans", []):
                        t = span.get("text", "").strip()
                        if t:
                            spans.append(t)
            span_text = " ".join(spans).strip()
            if span_text:
                return span_text
        except Exception:
            pass

        return text

    # ------------------------------------------------------------------
    # LAYER 2: pdfplumber text + table extraction
    # ------------------------------------------------------------------

    def _extract_pdfplumber_content(self, pdf_path: str, page_num: int) -> str:
        """
        Use pdfplumber for a richer extraction on a single page.
        Returns combined text + formatted tables as a string.
        Page num is 0-indexed internally.
        """
        if not PDFPLUMBER_AVAILABLE:
            return ""

        try:
            with pdfplumber.open(pdf_path) as pdf:
                if page_num >= len(pdf.pages):
                    return ""
                page = pdf.pages[page_num]

                parts = []

                # Text
                raw_text = page.extract_text(x_tolerance=3, y_tolerance=3)
                if raw_text and raw_text.strip():
                    parts.append(raw_text.strip())

                # Tables
                tables = page.extract_tables()
                for t_idx, table in enumerate(tables):
                    if not table:
                        continue
                    lines = [f"\n[TABLE {t_idx + 1} from page {page_num + 1}]"]
                    for row in table:
                        sanitised = [str(cell or "").strip() for cell in row]
                        if any(c for c in sanitised):
                            lines.append(" | ".join(sanitised))
                    parts.append("\n".join(lines))

                return "\n\n".join(parts)
        except Exception as e:
            print(f"    [WARNING] pdfplumber failed on page {page_num + 1}: {e}")
            return ""

    # ------------------------------------------------------------------
    # LAYER 3: OCR for scanned pages
    # ------------------------------------------------------------------

    def _extract_ocr_text(self, pdf_path: str, page_num_0indexed: int) -> str:
        """Run OCR on a single page using the OCRService."""
        if not ocr_service.ocr_enabled:
            return ""
        try:
            text = ocr_service.extract_text_from_pdf_page(pdf_path, page_num_0indexed)
            if text and text not in ("[OCR not available]", "[OCR failed]"):
                return text
        except Exception as e:
            print(f"    [WARNING] OCR failed: {e}")
        return ""

    # ------------------------------------------------------------------
    # COMBINED TEXT EXTRACTION
    # ------------------------------------------------------------------

    def _extract_text_from_page(
        self, page, page_num: int, pdf_path: Optional[str] = None
    ) -> List[Document]:
        """
        Multi-layer text extraction for a single PDF page.

        Priority order:
          1. pdfplumber (best for tables + complex layouts)
          2. PyMuPDF native (fast fallback)
          3. OCR via pytesseract (scanned pages)

        Args:
            page: PyMuPDF page object
            page_num: 1-indexed page number
            pdf_path: absolute path to the PDF file

        Returns:
            List of Document chunks
        """
        tables = []  # initialised here to prevent NameError
        has_images = len(page.get_images(full=True)) > 0

        # Attempt Layer 2 first (pdfplumber) — it handles tables natively
        text = ""
        if pdf_path:
            text = self._extract_pdfplumber_content(pdf_path, page_num - 1)
            if text:
                print(f"    [PDFPLUMBER] {len(text)} chars from page {page_num}")

        # Fall back to Layer 1 (PyMuPDF) if pdfplumber yielded nothing
        if not text.strip():
            text = self._extract_pymupdf_text(page)
            if text:
                print(f"    [PYMUPDF] {len(text)} chars from page {page_num}")

        # Layer 3 (OCR) if we still have very little text
        if pdf_path and ocr_service.should_use_ocr(len(text.strip()), has_images):
            print(f"    [OCR] Triggering OCR for page {page_num} (text={len(text.strip())})")
            ocr_text = self._extract_ocr_text(pdf_path, page_num - 1)
            if ocr_text and len(ocr_text) > len(text):
                text = ocr_text
                print(f"    [OCR] Got {len(text)} chars via OCR")

        # Legacy camelot/tabula tables (only if pdfplumber didn't already add tables)
        if pdf_path and ocr_service.table_extraction_enabled and "[TABLE" not in text:
            tables = ocr_service.extract_tables_from_pdf(pdf_path, page_num)
            if tables:
                print(f"    [TABLE] Appended {len(tables)} camelot/tabula tables (page {page_num})")
                for table in tables:
                    text += "\n\n" + ocr_service.format_table_as_text(table)

        if not text.strip():
            print(f"    [WARNING] Page {page_num}: no text found via any method")
            return []

        chunks = self.text_splitter.create_documents(
            [text],
            metadatas=[{
                "page": page_num,
                "type": "text",
                "source": "multi_layer_extraction",
                "has_images": has_images,
                "has_tables": len(tables),
                "char_count": len(text),
            }],
        )
        print(f"    [TEXT] Page {page_num}: {len(chunks)} chunks ({len(text)} chars)")
        return chunks

    # ------------------------------------------------------------------
    # IMAGE + VISION ANALYSIS
    # ------------------------------------------------------------------

    def _extract_images_from_page(
        self, doc, page, page_num: int, pdf_path: Optional[str] = None
    ) -> List[Document]:
        """
        Extract embedded images and describe them using the vision model.
        For pages that ARE images (scanned), the whole page is rendered and described.
        """
        image_chunks: List[Document] = []
        images = page.get_images(full=True)

        # --- Case A: embedded image objects ---
        if images:
            print(f"    [IMAGE] Page {page_num}: {len(images)} embedded images")
            for idx, img in enumerate(images):
                try:
                    xref = img[0]
                    base_img = doc.extract_image(xref)
                    img_bytes = base_img["image"]

                    # Skip tiny decorative images (< 5 KB)
                    if len(img_bytes) < 5_000:
                        continue

                    desc = self._describe_image_bytes(
                        img_bytes,
                        context=f"Page {page_num}, image {idx + 1}",
                    )
                    full_desc = f"[Chart/Image — Page {page_num}, Image {idx + 1}]:\n{desc}"
                    chunks = self.text_splitter.create_documents(
                        [full_desc],
                        metadatas=[{
                            "page": page_num,
                            "type": "image",
                            "source": "embedded_image",
                            "image_index": idx,
                        }],
                    )
                    image_chunks.extend(chunks)
                except Exception as e:
                    print(f"    [WARNING] Image {idx} on page {page_num} failed: {e}")

        # --- Case B: page IS a full-page scan (no embedded image objects, no text) ---
        # Use ocr_service.render_pdf_page_to_pil() — PyMuPDF-based, no Poppler needed
        elif pdf_path:
            try:
                page_text = page.get_text("text").strip()
                if len(page_text) < 30:
                    print(f"    [SCAN] Page {page_num}: rendering as full-page image for vision LLM")
                    pil_img = ocr_service.render_pdf_page_to_pil(pdf_path, page_num - 1, dpi=150)
                    if pil_img is not None:
                        import io as _io
                        buf = _io.BytesIO()
                        pil_img.save(buf, format="JPEG", quality=85)
                        img_bytes = buf.getvalue()
                        desc = self._describe_image_bytes(
                            img_bytes,
                            context=f"Full scanned page {page_num} from a financial document",
                        )
                        full_desc = f"[Scanned Page {page_num}]:\n{desc}"
                        chunks = self.text_splitter.create_documents(
                            [full_desc],
                            metadatas=[{
                                "page": page_num,
                                "type": "scanned_page",
                                "source": "full_page_render",
                            }],
                        )
                        image_chunks.extend(chunks)
            except Exception as e:
                print(f"    [WARNING] Full-page scan vision failed for page {page_num}: {e}")

        return image_chunks

    # ------------------------------------------------------------------
    # MAIN PDF PIPELINE
    # ------------------------------------------------------------------

    def process_pdf(self, file_path: str) -> List[Document]:
        """
        Process a PDF and return all content as Document chunks.
        Handles: digital text, complex tables, scanned pages, charts, images.
        """
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"File not found: {file_path}")

        print(f"\n[PDF] Opening: {file_path}")
        doc = fitz.open(file_path)
        total_pages = len(doc)
        print(f"[PDF] {total_pages} pages")

        all_chunks: List[Document] = []

        for page_num, page in enumerate(doc, start=1):
            print(f"\n  --- Page {page_num}/{total_pages} ---")
            all_chunks.extend(self._extract_text_from_page(page, page_num, file_path))
            all_chunks.extend(self._extract_images_from_page(doc, page, page_num, file_path))

        doc.close()

        if not all_chunks:
            raise ValueError(
                "No content could be extracted from this PDF. "
                "The file may be corrupt, password-protected, or contain only unsupported content."
            )

        print(f"\n[PDF] Extraction complete — {len(all_chunks)} total chunks")
        return all_chunks

    def process_file(self, file_path: str, file_name: str) -> List[Document]:
        """
        Process any supported file format and return Document chunks.
        """
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"File not found: {file_path}")
            
        ext = os.path.splitext(file_name.lower())[1]
        print(f"\n[PARSER] Processing file: {file_name} with extension {ext}")
        
        if ext == ".pdf":
            return self.process_pdf(file_path)
        elif ext in (".docx", ".doc"):
            return self.process_docx(file_path)
        elif ext in (".txt", ".md"):
            return self.process_txt(file_path)
        elif ext == ".csv":
            return self.process_csv(file_path)
        elif ext in (".xls", ".xlsx"):
            return self.process_excel(file_path)
        elif ext in (".png", ".jpg", ".jpeg", ".tiff", ".bmp", ".webp"):
            return self.process_image(file_path)
        else:
            try:
                return self.process_txt(file_path)
            except Exception:
                return self.process_pdf(file_path)

    def process_docx(self, file_path: str) -> List[Document]:
        """Extract text from DOCX files with docx library or pure python zipfile fallback."""
        text = ""
        try:
            import docx
            doc = docx.Document(file_path)
            text = "\n".join([p.text for p in doc.paragraphs])
            # extract tables
            for table in doc.tables:
                for row in table.rows:
                    text += "\n" + " | ".join([cell.text.strip() for cell in row.cells])
        except Exception:
            # Fallback to pure python zip file parser
            try:
                import zipfile
                import xml.etree.ElementTree as ET
                with zipfile.ZipFile(file_path) as zf:
                    xml_content = zf.read('word/document.xml')
                    root = ET.fromstring(xml_content)
                    text_parts = []
                    for elem in root.iter():
                        if elem.tag.endswith('t'):
                            text_parts.append(elem.text or "")
                    text = "".join(text_parts)
            except Exception as e:
                raise ValueError(f"Failed to extract text from DOCX file: {e}")
        
        if not text.strip():
            raise ValueError("No text could be extracted from this DOCX file.")
            
        chunks = self.text_splitter.create_documents(
            [text],
            metadatas=[{
                "page": 1,
                "type": "text",
                "source": "docx_extraction",
                "char_count": len(text)
            }]
        )
        return chunks

    def process_txt(self, file_path: str) -> List[Document]:
        """Extract text from plain text files."""
        try:
            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                text = f.read()
        except Exception as e:
            raise ValueError(f"Failed to read TXT file: {e}")
            
        if not text.strip():
            raise ValueError("No text found in the TXT file.")
            
        chunks = self.text_splitter.create_documents(
            [text],
            metadatas=[{
                "page": 1,
                "type": "text",
                "source": "txt_extraction",
                "char_count": len(text)
            }]
        )
        return chunks

    def process_csv(self, file_path: str) -> List[Document]:
        """Extract text from CSV files."""
        try:
            import csv
            lines = []
            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                reader = csv.reader(f)
                for row in reader:
                    sanitised = [c.strip() for c in row]
                    if any(sanitised):
                        lines.append(" | ".join(sanitised))
            text = "\n".join(lines)
        except Exception as e:
            raise ValueError(f"Failed to parse CSV file: {e}")
            
        if not text.strip():
            raise ValueError("CSV file is empty.")
            
        chunks = self.text_splitter.create_documents(
            [text],
            metadatas=[{
                "page": 1,
                "type": "table",
                "source": "csv_extraction",
                "char_count": len(text)
            }]
        )
        return chunks

    def process_excel(self, file_path: str) -> List[Document]:
        """Extract text from Excel files (.xlsx, .xls)."""
        text = ""
        try:
            # Try pandas first
            import pandas as pd
            excel_file = pd.ExcelFile(file_path)
            sheets_text = []
            for sheet_name in excel_file.sheet_names:
                df = excel_file.parse(sheet_name)
                sheet_lines = [f"\n[SHEET: {sheet_name}]"]
                headers = [str(col).strip() for col in df.columns]
                sheet_lines.append(" | ".join(headers))
                for _, row in df.iterrows():
                    row_vals = [str(val).strip() for val in row.values]
                    if any(v and v != "nan" for v in row_vals):
                        sheet_lines.append(" | ".join(row_vals))
                sheets_text.append("\n".join(sheet_lines))
            text = "\n\n".join(sheets_text)
        except Exception:
            # Try openpyxl directly
            try:
                import openpyxl
                wb = openpyxl.load_workbook(file_path, read_only=True, data_only=True)
                sheets_text = []
                for sheet in wb.worksheets:
                    sheet_lines = [f"\n[SHEET: {sheet.title}]"]
                    for row in sheet.iter_rows(values_only=True):
                        row_vals = [str(cell).strip() if cell is not None else "" for cell in row]
                        if any(row_vals):
                            sheet_lines.append(" | ".join(row_vals))
                    sheets_text.append("\n".join(sheet_lines))
                text = "\n\n".join(sheets_text)
            except Exception as e:
                raise ValueError(f"Failed to parse Excel file: {e}")
                
        if not text.strip():
            raise ValueError("Excel file is empty.")
            
        chunks = self.text_splitter.create_documents(
            [text],
            metadatas=[{
                "page": 1,
                "type": "table",
                "source": "excel_extraction",
                "char_count": len(text)
            }]
        )
        return chunks

    def process_image(self, file_path: str) -> List[Document]:
        """Extract text from image files using OCR or vision LLM."""
        try:
            from PIL import Image
            pil_img = Image.open(file_path)
            
            ocr_text = ""
            if ocr_service.ocr_enabled:
                ocr_text = ocr_service.extract_text_from_image(pil_img)
                
            if not ocr_text or len(ocr_text.strip()) < 30:
                print(f"    [IMAGE] OCR yielded minimal results, trying vision description")
                try:
                    with open(file_path, "rb") as f:
                        img_bytes = f.read()
                    desc = self._describe_image_bytes(
                        img_bytes,
                        context=f"Uploaded image file: {os.path.basename(file_path)}"
                    )
                    ocr_text = f"[Image Description]:\n{desc}"
                except Exception:
                    if not ocr_text:
                        ocr_text = "[Image could not be processed]"
            
            chunks = self.text_splitter.create_documents(
                [ocr_text],
                metadatas=[{
                    "page": 1,
                    "type": "image",
                    "source": "image_ocr",
                    "char_count": len(ocr_text)
                }]
            )
            return chunks
        except Exception as e:
            raise ValueError(f"Failed to process image: {e}")

    # ------------------------------------------------------------------
    # COMPLETE PIPELINE (File → Vectors → Notify)
    # ------------------------------------------------------------------

    def process_document_pipeline(
        self,
        document_id: str,
        file_path: str,
        file_name: str,
        vector_namespace: str,
    ) -> None:
        """
        End-to-end pipeline:
        1. Extract content (text + tables + images)
        2. Embed and store in FAISS vector store
        3. Notify Node.js backend via webhook
        """
        print(f"\n{'='*60}")
        print(f"[PIPELINE] Starting: {file_name}")
        print(f"  Document ID : {document_id}")
        print(f"  Namespace   : {vector_namespace}")
        print(f"{'='*60}")

        try:
            # Step 1 — Extract
            chunks = self.process_file(file_path, file_name)

            # Enrich chunk metadata
            for chunk in chunks:
                if chunk.metadata is None:
                    chunk.metadata = {}
                chunk.metadata["document_id"] = document_id
                chunk.metadata["filename"] = file_name
                chunk.metadata["vector_namespace"] = vector_namespace

            # Step 2 — Embed + store
            print(f"\n[VECTOR] Creating embeddings for {len(chunks)} chunks…")
            vector_store.create_vector_store(chunks, vector_namespace)

            # Step 3 — Notify success
            print(f"\n[WEBHOOK] Notifying Node.js backend…")
            self._notify_backend(document_id, status="processed")

            print(f"\n{'='*60}")
            print(f"[OK] Pipeline completed successfully!")
            print(f"{'='*60}\n")

        except Exception as e:
            print(f"\n{'='*60}")
            print(f"[ERROR] Pipeline failed: {e}")
            print(f"{'='*60}\n")
            self._notify_backend(document_id, status="failed", error=str(e))

    def _notify_backend(
        self,
        document_id: str,
        status: str,
        error: Optional[str] = None,
    ) -> None:
        """Send status webhook to Node.js backend."""
        try:
            url = f"{settings.NODE_WEBHOOK_URL}/api/v1/documents/{document_id}/status"
            payload = {"status": status}
            if error:
                payload["errorMessage"] = error
            resp = requests.patch(url, json=payload, timeout=10)
            if resp.status_code == 200:
                print(f"[WEBHOOK] Notification sent (status={status})")
            else:
                print(f"[WARNING] Webhook returned HTTP {resp.status_code}")
        except Exception as e:
            print(f"[WARNING] Webhook notification failed: {e}")


# Singleton instance
document_processor = DocumentProcessor()
