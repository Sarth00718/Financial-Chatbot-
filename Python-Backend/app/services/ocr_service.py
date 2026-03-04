"""
OCR Service
Handles OCR for scanned PDFs and images — Poppler-FREE.

Uses PyMuPDF (fitz) to render PDF pages as images at high DPI
instead of pdf2image/Poppler, so it works on Windows without
any extra system binaries.
"""

import os
import io
from typing import List, Dict, Optional
from PIL import Image
import numpy as np

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

# Optional: pytesseract + OpenCV for local OCR
try:
    import pytesseract
    import cv2
    PYTESSERACT_AVAILABLE = True
except ImportError:
    PYTESSERACT_AVAILABLE = False
    print("[WARNING] pytesseract / cv2 not installed — local OCR disabled")

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


class OCRService:
    """
    OCR and table extraction service.
    Renders PDF pages via PyMuPDF (no Poppler needed) then runs
    pytesseract if available, or falls back to pdfplumber / camelot.
    """

    def __init__(self):
        self.ocr_enabled = PYTESSERACT_AVAILABLE and PYMUPDF_AVAILABLE
        self.table_extraction_enabled = TABLE_EXTRACTION_AVAILABLE or PDFPLUMBER_AVAILABLE

        if self.ocr_enabled:
            print("[INIT] OCR service ready (PyMuPDF + pytesseract)")
        elif PYMUPDF_AVAILABLE:
            print("[INIT] OCR: PyMuPDF page rendering available; pytesseract unavailable — vision LLM fallback active")
        else:
            print("[INIT] OCR fully disabled")

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

    def preprocess_image(self, pil_image: Image.Image) -> Optional[np.ndarray]:
        """Convert PIL → grayscale OpenCV array, denoised."""
        if not PYTESSERACT_AVAILABLE:
            return None
        try:
            img_array = np.array(pil_image.convert("RGB"))
            gray = cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY)
            _, binary = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
            denoised = cv2.fastNlMeansDenoising(binary, None, 10, 7, 21)
            return denoised
        except Exception as e:
            print(f"    [WARNING] Image preprocessing failed: {e}")
            return np.array(pil_image.convert("L"))

    # ------------------------------------------------------------------
    # OCR on a PIL image
    # ------------------------------------------------------------------

    def extract_text_from_image(self, image: Image.Image) -> str:
        """Run pytesseract OCR on a PIL image."""
        if not PYTESSERACT_AVAILABLE:
            return "[OCR not available — pytesseract not installed]"
        try:
            processed = self.preprocess_image(image)
            if processed is None:
                processed = np.array(image.convert("L"))
            text = pytesseract.image_to_string(processed, config="--psm 6")
            return text.strip()
        except Exception as e:
            print(f"    [ERROR] pytesseract OCR failed: {e}")
            return "[OCR failed]"

    # ------------------------------------------------------------------
    # OCR on a single PDF page (Poppler-free via PyMuPDF render)
    # ------------------------------------------------------------------

    def extract_text_from_pdf_page(self, pdf_path: str, page_num: int) -> str:
        """
        Render a PDF page with PyMuPDF then OCR it with pytesseract.
        No Poppler required.

        Args:
            pdf_path: absolute path to the PDF
            page_num: 0-based page index

        Returns:
            OCR-extracted text string
        """
        if not PYTESSERACT_AVAILABLE:
            return "[OCR not available — pytesseract not installed]"

        pil_image = self.render_pdf_page_to_pil(pdf_path, page_num, dpi=300)
        if pil_image is None:
            return "[OCR failed — could not render page]"

        text = self.extract_text_from_image(pil_image)
        if text:
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
