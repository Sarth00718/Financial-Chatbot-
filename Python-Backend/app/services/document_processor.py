"""
Document Processing Service
Handles multi-format document processing with a Strategy Pattern parser system.
"""

import os
import requests
import base64
from typing import List, Optional
from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage

from app.core.settings import settings
from app.services.vector_store import vector_store

# Import parsers to ensure they are registered with ParserFactory
from app.services.parsers.parser_factory import ParserFactory
import app.services.parsers.basic_parsers
import app.services.parsers.pdf_parser
import app.services.parsers.pptx_parser
import app.services.parsers.docx_parser

class DocumentProcessor:
    """
    Orchestrator for document processing.
    Delegates actual parsing to specific Parser classes via ParserFactory.
    """

    def __init__(self):
        """Initialize processor with text splitter and optional vision model"""
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=settings.CHUNK_SIZE,
            chunk_overlap=settings.CHUNK_OVERLAP,
        )

        # Enable vision model: Gemini as primary with Groq as fallback
        self.groq_vision_llm = None
        try:
            self.groq_vision_llm = ChatOpenAI(
                model=settings.VISION_MODEL,
                base_url="https://api.groq.com/openai/v1",
                api_key=settings.GROQ_API_KEY,
                temperature=0.1,
                max_tokens=500,
            )
        except Exception as e:
            from app.core.logger import logger
            logger.error(f"Failed to initialize Groq vision model: {e}")

        self.gemini_vision_llm = None
        if settings.GEMINI_API_KEY:
            try:
                self.gemini_vision_llm = ChatOpenAI(
                    model=settings.GEMINI_VISION_MODEL,
                    base_url="https://generativelanguage.googleapis.com/v1beta/openai/",
                    api_key=settings.GEMINI_API_KEY,
                    temperature=0.1,
                    max_tokens=500,
                )
                print(f"[VISION] Primary: Gemini Vision ({settings.GEMINI_VISION_MODEL}) | Fallback: Groq ({settings.VISION_MODEL})")
            except Exception as e:
                from app.core.logger import logger
                logger.error(f"Failed to setup Gemini Vision: {e}")
                self.gemini_vision_llm = None

        self.vision_enabled = bool(self.gemini_vision_llm or self.groq_vision_llm)

    def _describe_image_bytes(self, image_bytes: bytes, context: str = "") -> str:
        """
        Uses Gemini Vision first to describe the image/chart, falling back to Groq Vision.
        This is passed as a callback to the parsers.
        """
        if not self.vision_enabled:
            return "[Image/chart present - vision model disabled]"

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
                        "image_url": {"url": f"data:image/jpeg;base64,{b64_img}"},
                    },
                ]
            )

            # 1. Try Gemini Vision
            if self.gemini_vision_llm:
                try:
                    response = self.gemini_vision_llm.invoke([msg])
                    return f"[VISION DESCRIPTION: {response.content.strip()}]"
                except Exception as e:
                    from app.core.logger import logger
                    logger.warning(f"Gemini Vision failed ({e}). Falling back to Groq Vision...")

            # 2. Fallback to Groq Vision
            if self.groq_vision_llm:
                try:
                    response = self.groq_vision_llm.invoke([msg])
                    return f"[VISION DESCRIPTION: {response.content.strip()}]"
                except Exception as e:
                    from app.core.logger import logger
                    logger.error(f"Groq Vision fallback also failed: {e}")
                    return f"[Image/chart present - vision failed: {e}]"

            return "[Image/chart present - no vision model available]"

        except Exception as e:
            from app.core.logger import logger
            logger.error(f"Vision processing failed: {e}")
            return f"[Image/chart present - vision failed: {e}]"

    def process_file(self, file_path: str, file_name: str) -> List[Document]:
        """
        Process any supported file format and return Document chunks.
        Delegates to the appropriate parser registered in ParserFactory.
        """
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"File not found: {file_path}")

        parser_cls = ParserFactory.get_parser(file_name)
        if not parser_cls:
            print(
                f"\n[WARNING] No explicit parser found for {file_name}. Falling back to PDFParser/TextParser."
            )
            try:
                parser_cls = ParserFactory.get_parser("fallback.txt")
                parser = parser_cls(self.text_splitter, self._describe_image_bytes)
                return parser.extract(file_path, file_name)
            except Exception:
                parser_cls = ParserFactory.get_parser("fallback.pdf")

        if not parser_cls:
            raise ValueError(f"No parser available for file: {file_name}")

        ext = os.path.splitext(file_name.lower())[1]
        print(
            f"\n[PARSER] Processing file: {file_name} with extension {ext} using {parser_cls.__name__}"
        )

        parser = parser_cls(self.text_splitter, self._describe_image_bytes)
        return parser.extract(file_path, file_name)

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
            # Step 1 - Extract
            chunks = self.process_file(file_path, file_name)

            # Enrich chunk metadata
            for chunk in chunks:
                if chunk.metadata is None:
                    chunk.metadata = {}
                chunk.metadata["document_id"] = document_id
                chunk.metadata["filename"] = file_name
                chunk.metadata["vector_namespace"] = vector_namespace

            # Step 2 - Embed + store
            print(f"\n[VECTOR] Creating embeddings for {len(chunks)} chunks...")
            vector_store.create_vector_store(chunks, vector_namespace)

            # Step 3 - Notify success
            print(f"\n[WEBHOOK] Notifying Node.js backend...")
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
