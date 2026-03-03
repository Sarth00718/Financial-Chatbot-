"""
Document Processing Service
Handles PDF processing, text extraction, and image analysis
"""

import os
import base64
import requests
import pymupdf as fitz  # PyMuPDF for PDF processing
from typing import List
from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage

from app.config.settings import settings
from app.services.vector_store import vector_store


class DocumentProcessor:
    """
    Processes documents for RAG (Retrieval Augmented Generation)
    Extracts text and analyzes images using multi-modal AI
    """
    
    def __init__(self):
        """Initialize document processor with text splitter and vision model"""
        # Text splitter for chunking documents
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=settings.CHUNK_SIZE,
            chunk_overlap=settings.CHUNK_OVERLAP
        )
        
        # Vision-capable LLM for image analysis
        self.vision_llm = ChatOpenAI(
            model=settings.LLM_MODEL,
            max_tokens=500,  # Limit image descriptions to save credits
            openai_api_key=settings.GROQ_API_KEY,
            openai_api_base="https://api.groq.com/openai/v1",
        )
    
    def _get_image_description(self, image_bytes: bytes) -> str:
        """
        Use Gemini Vision to generate a description of an image
        
        Args:
            image_bytes: Raw image data
            
        Returns:
            Text description of the image
        """
        try:
            # Encode image to base64
            b64_image = base64.b64encode(image_bytes).decode('utf-8')
            
            # Create message with image
            message = HumanMessage(
                content=[
                    {
                        "type": "text",
                        "text": (
                            "Describe this financial chart, table, or image from a document in detail. "
                            "Focus on key data, trends, and conclusions. Be factual and objective."
                        )
                    },
                    {
                        "type": "image_url",
                        "image_url": f"data:image/jpeg;base64,{b64_image}"
                    },
                ]
            )
            
            # Get description from vision model
            response = self.vision_llm.invoke([message])
            description = response.content if response.content else "Could not describe image."
            
            print(f"  [OK] Generated image description ({len(description)} chars)")
            return description
            
        except Exception as e:
            print(f"  [ERROR] Error generating image description: {e}")
            return "Image description unavailable due to processing error."
    
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
        
        for img_index, img in enumerate(images):
            try:
                # Extract image data
                xref = img[0]
                base_image = doc.extract_image(xref)
                image_bytes = base_image["image"]
                
                # Get AI description of the image
                description = self._get_image_description(image_bytes)
                
                # Create context-aware description
                full_description = (
                    f"[Image from page {page_num}]: {description}"
                )
                
                # Create document chunk for the image description
                image_chunk = self.text_splitter.create_documents(
                    [full_description],
                    metadatas=[{
                        "page": page_num,
                        "type": "image",
                        "source": "pdf_image",
                        "image_index": img_index
                    }]
                )
                
                image_chunks.extend(image_chunk)
                
            except Exception as e:
                print(f"  [WARNING] Error processing image {img_index} on page {page_num}: {e}")
                continue
        
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
            
            # Open PDF
            doc = fitz.open(file_path)
            print(f"[PDF] PDF has {len(doc)} pages")
            
            all_chunks = []
            
            # Process each page
            for page_num, page in enumerate(doc, start=1):
                print(f"\n  Processing page {page_num}/{len(doc)}...")
                
                # Extract text chunks
                text_chunks = self._extract_text_from_page(page, page_num)
                all_chunks.extend(text_chunks)
                
                # Extract and analyze images
                image_chunks = self._extract_images_from_page(doc, page, page_num)
                all_chunks.extend(image_chunks)
            
            # Close document
            doc.close()
            
            if not all_chunks:
                raise ValueError("No content extracted from PDF")
            
            print(f"\n[OK] PDF processing complete: {len(all_chunks)} total chunks")
            return all_chunks
            
        except Exception as e:
            print(f"\n[ERROR] Error processing PDF: {e}")
            raise
    
    def process_document_pipeline(
        self,
        document_id: str,
        file_path: str,
        file_name: str,
        vector_namespace: str
    ) -> None:
        """
        Complete document processing pipeline
        1. Extract content from PDF
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
            
            # Step 1: Process PDF and extract content
            chunks = self.process_pdf(file_path)
            
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
