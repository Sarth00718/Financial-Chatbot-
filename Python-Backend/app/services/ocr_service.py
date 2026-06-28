"""
OCR Service
Handles OCR for scanned PDFs and images using Cloud OCR APIs.

Supports multiple cloud OCR providers:
- OCR.Space (free tier, no authentication required)
- Google Cloud Vision (powerful, requires API key)
- Azure AI Vision (requires API key)

Uses PyMuPDF (fitz) to render PDF pages as images at high DPI.
"""

import os
import io
import requests
import json
from typing import List, Dict, Optional
from PIL import Image
import numpy as np
import base64

# Try import PyMuPDF (should always be available — it's in requirements)
try:
    import pymupdf as fitz
    PYMUPDF_AVAILABLE = True
except ImportError:
    try:
        import fitz  # older package name
        PYMUPDF_AVAILABLE = True
    except ImportError:
        PYMUPDF_AVAILABLE = False
        print("[WARNING] PyMuPDF not found — OCR page rendering unavailable")

# Optional: camelot + tabula for table extraction
try:
    import camelot
    import tabula
    TABLE_EXTRACTION_AVAILABLE = True
except ImportError:
    TABLE_EXTRACTION_AVAILABLE = False
    print("[WARNING] camelot / tabula not installed — table extraction disabled")

# pdfplumber for fallback table extraction (no Java required)
try:
    import pdfplumber
    PDFPLUMBER_AVAILABLE = True
except ImportError:
    PDFPLUMBER_AVAILABLE = False

# Optional: Google Cloud Vision
try:
    from google.cloud import vision
    GOOGLE_VISION_AVAILABLE = True
except ImportError:
    GOOGLE_VISION_AVAILABLE = False
    print("[INFO] Google Cloud Vision not installed — use 'pip install google-cloud-vision'")


class OCRService:
    """
    OCR and table extraction service using Cloud OCR APIs.
    Renders PDF pages via PyMuPDF (no Poppler/Tesseract needed) then runs
    cloud OCR service.
    """

    def __init__(self):
        from app.config.settings import settings
        
        self.ocr_enabled = PYMUPDF_AVAILABLE
        self.table_extraction_enabled = TABLE_EXTRACTION_AVAILABLE or PDFPLUMBER_AVAILABLE
        
        # Determine which OCR provider to use
        self.ocr_provider = settings.OCR_PROVIDER or "ocr_space"
        self.ocr_provider = self.ocr_provider.lower()
        
        # Set API credentials based on provider
        if self.ocr_provider == "google_vision":
            self.google_api_key = settings.GOOGLE_VISION_API_KEY
            if not self.google_api_key:
                self.ocr_enabled = False
                print("[WARNING] Google Vision API key not set")
            else:
                print("[INIT] OCR service configured: Google Cloud Vision")
                
        elif self.ocr_provider == "azure_vision":
            self.azure_api_key = settings.AZURE_VISION_API_KEY
            self.azure_endpoint = settings.AZURE_VISION_ENDPOINT
            if not self.azure_api_key or not self.azure_endpoint:
                self.ocr_enabled = False
                print("[WARNING] Azure Vision credentials not set")
            else:
                print("[INIT] OCR service configured: Azure AI Vision")
                
        elif self.ocr_provider == "ocr_space":
            self.ocr_space_api_key = settings.OCR_SPACE_API_KEY or "K87899142"  # Free tier key
            print("[INIT] OCR service configured: OCR.Space (Free Tier)")
        else:
            print(f"[WARNING] Unknown OCR provider: {self.ocr_provider}, defaulting to OCR.Space")
            self.ocr_provider = "ocr_space"
            self.ocr_space_api_key = settings.OCR_SPACE_API_KEY or "K87899142"

        if self.ocr_enabled:
            print(f"[INIT] OCR service ready (PyMuPDF + {self.ocr_provider})")
        else:
            print("[INIT] OCR disabled")

        if self.table_extraction_enabled:
            print("[INIT] Table extraction ready")

    # ------------------------------------------------------------------
    # Page → PIL Image via PyMuPDF (NO Poppler needed)
    # ------------------------------------------------------------------

    def render_pdf_page_to_pil(
        self, pdf_path: str, page_num_0indexed: int, dpi: int = 250
    ) -> Optional[Image.Image]:
        """
        Render a single PDF page to a PIL Image using PyMuPDF.
        This replaces pdf2image/convert_from_path and requires NO Poppler.

        Args:
            pdf_path: absolute path to the PDF
            page_num_0indexed: 0-based page index
            dpi: render resolution (higher = better OCR, more memory)

        Returns:
            PIL Image or None on failure
        """
        if not PYMUPDF_AVAILABLE:
            return None
        try:
            doc = fitz.open(pdf_path)
            if page_num_0indexed >= len(doc):
                doc.close()
                return None
            page = doc[page_num_0indexed]
            zoom = dpi / 72          # 72 is PDF base DPI
            mat = fitz.Matrix(zoom, zoom)
            pix = page.get_pixmap(matrix=mat, colorspace=fitz.csRGB, alpha=False)
            img_bytes = pix.tobytes("png")
            doc.close()
            return Image.open(io.BytesIO(img_bytes))
        except Exception as e:
            print(f"    [ERROR] PyMuPDF page render failed (page {page_num_0indexed}): {e}")
            return None

    # ------------------------------------------------------------------
    # Image preprocessing for OCR
    # ------------------------------------------------------------------

    # ------------------------------------------------------------------
    # Image preprocessing
    # ------------------------------------------------------------------

    def preprocess_image_for_ocr(self, pil_image: Image.Image) -> bytes:
        """Convert PIL image to bytes for cloud OCR."""
        try:
            img_byte_arr = io.BytesIO()
            pil_image.save(img_byte_arr, format='PNG')
            img_byte_arr.seek(0)
            return img_byte_arr.getvalue()
        except Exception as e:
            print(f"    [WARNING] Image preprocessing failed: {e}")
            return None

    # ------------------------------------------------------------------
    # Cloud OCR API Callers
    # ------------------------------------------------------------------

    def ocr_space_extract_text(self, image_bytes: bytes) -> str:
        """
        Call OCR.Space API to extract text from image.
        Free tier: 25,000 requests/month, no authentication required.
        """
        try:
            url = "https://api.ocr.space/parse/image"
            
            files = {'filename': image_bytes}
            payload = {
                'apikey': self.ocr_space_api_key,
                'language': 'eng',  # English
                'isOverlayRequired': False,
            }
            
            response = requests.post(url, files=files, data=payload, timeout=30)
            result = response.json()
            
            if result.get('IsErroredOnProcessing'):
                error_msg = result.get('ErrorMessage', ['Unknown error'])[0]
                print(f"    [ERROR] OCR.Space API error: {error_msg}")
                return "[OCR failed]"
            
            text = result.get('ParsedText', '')
            return text.strip()
            
        except Exception as e:
            print(f"    [ERROR] OCR.Space API call failed: {e}")
            return "[OCR failed]"

    def google_vision_extract_text(self, image_bytes: bytes) -> str:
        """
        Call Google Cloud Vision API to extract text from image.
        Requires google-cloud-vision library and API key.
        """
        try:
            if not GOOGLE_VISION_AVAILABLE:
                return "[Google Vision not installed]"
            
            client = vision.ImageAnnotatorClient()
            image = vision.Image(content=image_bytes)
            response = client.text_detection(image=image)
            
            if response.error.message:
                print(f"    [ERROR] Google Vision error: {response.error.message}")
                return "[OCR failed]"
            
            texts = response.text_annotations
            if not texts:
                return "[No text detected]"
            
            # First annotation contains all text
            extracted_text = texts[0].description
            return extracted_text.strip()
            
        except Exception as e:
            print(f"    [ERROR] Google Vision API call failed: {e}")
            return "[OCR failed]"

    def azure_vision_extract_text(self, image_bytes: bytes) -> str:
        """
        Call Azure AI Vision API to extract text from image.
        Requires azure-cognitiveservices-vision-computervision library and credentials.
        """
        try:
            url = f"{self.azure_endpoint}/vision/v3.2/read/analyze"
            headers = {
                'Ocp-Apim-Subscription-Key': self.azure_api_key,
                'Content-Type': 'application/octet-stream'
            }
            
            response = requests.post(url, headers=headers, data=image_bytes, timeout=30)
            
            if response.status_code != 202:
                print(f"    [ERROR] Azure Vision returned {response.status_code}")
                return "[OCR failed]"
            
            # Get the operation location
            operation_url = response.headers.get('Operation-Location')
            if not operation_url:
                return "[OCR failed]"
            
            # Poll for results (Azure is async)
            import time
            max_retries = 30
            retry_count = 0
            
            while retry_count < max_retries:
                result_response = requests.get(
                    operation_url,
                    headers={'Ocp-Apim-Subscription-Key': self.azure_api_key},
                    timeout=10
                )
                result = result_response.json()
                
                if result.get('status') == 'succeeded':
                    # Extract text from results
                    text_parts = []
                    for page in result.get('analyzeResult', {}).get('readResults', []):
                        for line in page.get('lines', []):
                            text_parts.append(line.get('text', ''))
                    return ' '.join(text_parts).strip()
                elif result.get('status') == 'failed':
                    return "[OCR failed]"
                
                time.sleep(1)
                retry_count += 1
            
            return "[OCR timeout]"
            
        except Exception as e:
            print(f"    [ERROR] Azure Vision API call failed: {e}")
            return "[OCR failed]"

    # ------------------------------------------------------------------
    # OCR on a PIL image (delegates to configured provider)
    # ------------------------------------------------------------------

    def extract_text_from_image(self, image: Image.Image) -> str:
        """Run cloud OCR on a PIL image using configured provider."""
        if not self.ocr_enabled:
            return "[OCR disabled]"
        
        try:
            image_bytes = self.preprocess_image_for_ocr(image)
            if not image_bytes:
                return "[OCR failed — image processing error]"
            
            if self.ocr_provider == "google_vision":
                return self.google_vision_extract_text(image_bytes)
            elif self.ocr_provider == "azure_vision":
                return self.azure_vision_extract_text(image_bytes)
            else:  # ocr_space (default)
                return self.ocr_space_extract_text(image_bytes)
                
        except Exception as e:
            print(f"    [ERROR] OCR extraction failed: {e}")
            return "[OCR failed]"

    # ------------------------------------------------------------------
    # OCR on a single PDF page (PyMuPDF render + cloud OCR)
    # ------------------------------------------------------------------

    def extract_text_from_pdf_page(self, pdf_path: str, page_num: int) -> str:
        """
        Render a PDF page with PyMuPDF then OCR it with cloud API.
        No local OCR engine required.

        Args:
            pdf_path: absolute path to the PDF
            page_num: 0-based page index

        Returns:
            OCR-extracted text string
        """
        if not self.ocr_enabled:
            return "[OCR disabled]"

        pil_image = self.render_pdf_page_to_pil(pdf_path, page_num, dpi=300)
        if pil_image is None:
            return "[OCR failed — could not render page]"

        text = self.extract_text_from_image(pil_image)
        if text and text != "[OCR failed]":
            print(f"    [OCR] Extracted {len(text)} chars from page {page_num + 1}")
        return text

    # ------------------------------------------------------------------
    # Table extraction
    # ------------------------------------------------------------------

    def extract_tables_from_pdf(self, pdf_path: str, page_num: int) -> List[Dict]:
        """
        Extract tables from a PDF page using camelot, tabula, or pdfplumber.
        Page num is 1-indexed (camelot convention).
        """
        tables: List[Dict] = []

        # Try camelot (best quality, requires Ghostscript on Windows)
        if TABLE_EXTRACTION_AVAILABLE:
            try:
                ct = camelot.read_pdf(pdf_path, pages=str(page_num), flavor="lattice")
                for t in ct:
                    df = t.df
                    tables.append({
                        "method": "camelot",
                        "accuracy": t.accuracy,
                        "data": df.to_dict("records"),
                        "headers": df.columns.tolist(),
                        "rows": len(df),
                    })
            except Exception as e:
                print(f"    [WARNING] Camelot failed: {e}")

            if not tables:
                try:
                    tab_dfs = tabula.read_pdf(pdf_path, pages=page_num, multiple_tables=True)
                    for df in tab_dfs:
                        tables.append({
                            "method": "tabula",
                            "data": df.to_dict("records"),
                            "headers": df.columns.tolist(),
                            "rows": len(df),
                        })
                except Exception as e:
                    print(f"    [WARNING] Tabula failed: {e}")

        # pdfplumber fallback (no Java, no Ghostscript required)
        if not tables and PDFPLUMBER_AVAILABLE:
            try:
                with pdfplumber.open(pdf_path) as pdf:
                    if page_num - 1 < len(pdf.pages):
                        pdp_tables = pdf.pages[page_num - 1].extract_tables()
                        for t in pdp_tables:
                            if not t:
                                continue
                            headers = [str(c) for c in (t[0] or [])]
                            rows = []
                            for row in t[1:]:
                                rows.append({h: str(v or "") for h, v in zip(headers, row)})
                            tables.append({
                                "method": "pdfplumber",
                                "data": rows,
                                "headers": headers,
                                "rows": len(rows),
                            })
            except Exception as e:
                print(f"    [WARNING] pdfplumber table extraction failed: {e}")

        return tables

    # ------------------------------------------------------------------
    # Table formatter
    # ------------------------------------------------------------------

    def format_table_as_text(self, table: Dict) -> str:
        """Format a table dict as a readable text block."""
        lines = [f"\n[TABLE — extracted via {table.get('method', 'unknown')}]"]
        if "accuracy" in table:
            lines.append(f"Accuracy: {table['accuracy']:.1f}%")

        headers = table.get("headers", [])
        if headers:
            lines.append(" | ".join(str(h) for h in headers))
            lines.append("-" * 60)

        data = table.get("data", [])
        for row in data[:30]:
            row_vals = [str(row.get(str(h), "")) for h in headers]
            lines.append(" | ".join(row_vals))

        if len(data) > 30:
            lines.append(f"... ({len(data) - 30} more rows)")

        return "\n".join(lines)

    # ------------------------------------------------------------------
    # Heuristic: should we attempt OCR on this page?
    # ------------------------------------------------------------------

    def should_use_ocr(self, text_length: int, has_images: bool) -> bool:
        """
        Returns True when OCR is worth attempting.
        Triggered when text is very short OR the page contains images
        with minimal surrounding text.
        """
        return text_length < 50 or (has_images and text_length < 200)


# Singleton
ocr_service = OCRService()
