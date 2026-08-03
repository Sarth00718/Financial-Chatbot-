import os
import pymupdf as fitz  # PyMuPDF
from typing import List, Optional

from app.services.parsers.base_parser import BaseParser
from app.services.parsers.parser_factory import ParserFactory
from app.services.ocr_service import ocr_service

# Optional imports with graceful fallbacks
try:
    import pdfplumber

    PDFPLUMBER_AVAILABLE = True
except ImportError:
    PDFPLUMBER_AVAILABLE = False
    print(
        "[WARNING] pdfplumber not installed - table extraction via pdfplumber disabled"
    )


@ParserFactory.register_parser([".pdf"])
class PDFParser(BaseParser):
    def _extract_blocks(self, file_path: str, file_name: str) -> List[dict]:
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"File not found: {file_path}")

        print(f"\n[PDF] Opening: {file_path}")
        doc = fitz.open(file_path)
        total_pages = len(doc)
        print(f"[PDF] {total_pages} pages")

        blocks = []

        for page_num, page in enumerate(doc, start=1):
            print(f"\n  --- Page {page_num}/{total_pages} ---")
            blocks.extend(self._extract_text_from_page(page, page_num, file_path))
            blocks.extend(
                self._extract_images_from_page(doc, page, page_num, file_path)
            )

        doc.close()
        return blocks

    def _extract_text_from_page(
        self, page, page_num: int, pdf_path: Optional[str] = None
    ) -> List[dict]:
        tables = []
        has_images = len(page.get_images(full=True)) > 0
        text = ""

        if pdf_path:
            text = self._extract_pdfplumber_content(pdf_path, page_num - 1)
            if text:
                print(f"    [PDFPLUMBER] {len(text)} chars from page {page_num}")

        if not text.strip():
            text = self._extract_pymupdf_text(page)
            if text:
                print(f"    [PYMUPDF] {len(text)} chars from page {page_num}")

        if pdf_path and ocr_service.should_use_ocr(len(text.strip()), has_images):
            print(
                f"    [OCR] Triggering OCR for page {page_num} (text={len(text.strip())})"
            )
            ocr_text = self._extract_ocr_text(page)
            if ocr_text and len(ocr_text) > len(text):
                text = ocr_text
                print(f"    [OCR] Got {len(text)} chars via OCR")

        if not text.strip():
            print(f"    [WARNING] Page {page_num}: no text found via any method")
            return []

        return [
            {
                "text": text,
                "metadata": {
                    "page": page_num,
                    "type": "text",
                    "source": "multi_layer_extraction",
                    "has_images": has_images,
                    "has_tables": len(tables),
                    "char_count": len(text),
                },
            }
        ]

    def _extract_images_from_page(
        self, doc, page, page_num: int, pdf_path: Optional[str] = None
    ) -> List[dict]:
        image_blocks = []
        images = page.get_images(full=True)

        if images:
            print(f"    [IMAGE] Page {page_num}: {len(images)} embedded images")
            for idx, img in enumerate(images):
                try:
                    xref = img[0]
                    base_img = doc.extract_image(xref)
                    img_bytes = base_img["image"]

                    if len(img_bytes) < 5_000:
                        continue

                    if self.vision_callback:
                        desc = self.vision_callback(
                            img_bytes, f"Page {page_num}, image {idx + 1}"
                        )
                    else:
                        desc = "[Image present - vision model disabled]"

                    full_desc = (
                        f"[Chart/Image - Page {page_num}, Image {idx + 1}]:\n{desc}"
                    )
                    image_blocks.append(
                        {
                            "text": full_desc,
                            "metadata": {
                                "page": page_num,
                                "type": "image",
                                "source": "embedded_image",
                                "image_index": idx,
                            },
                        }
                    )
                except Exception as e:
                    print(f"    [WARNING] Image {idx} on page {page_num} failed: {e}")

        elif pdf_path:
            try:
                page_text = page.get_text("text").strip()
                if len(page_text) < 30:
                    print(
                        f"    [SCAN] Page {page_num}: rendering as full-page image for vision LLM"
                    )
                    pil_img = self._render_pdf_page_to_pil(page, dpi=150)
                    if pil_img is not None:
                        import io as _io

                        buf = _io.BytesIO()
                        pil_img.save(buf, format="JPEG", quality=85)
                        img_bytes = buf.getvalue()

                        if self.vision_callback:
                            desc = self.vision_callback(
                                img_bytes,
                                f"Full scanned page {page_num} from a financial document",
                            )
                        else:
                            desc = "[Scanned page present - vision model disabled]"

                        full_desc = f"[Scanned Page {page_num}]:\n{desc}"
                        image_blocks.append(
                            {
                                "text": full_desc,
                                "metadata": {
                                    "page": page_num,
                                    "type": "scanned_page",
                                    "source": "full_page_render",
                                },
                            }
                        )
            except Exception as e:
                print(
                    f"    [WARNING] Full-page scan vision failed for page {page_num}: {e}"
                )

        return image_blocks

    def _extract_pymupdf_text(self, page) -> str:
        text = page.get_text("text").strip()
        if len(text) >= 50:
            return text

        try:
            blocks = page.get_text("blocks")
            block_text = "\n".join(
                b[4] for b in blocks if len(b) > 4 and str(b[4]).strip()
            )
            if len(block_text.strip()) >= 50:
                return block_text.strip()
        except Exception:
            pass

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

    def _extract_pdfplumber_content(self, pdf_path: str, page_num: int) -> str:
        if not PDFPLUMBER_AVAILABLE:
            return ""

        try:
            with pdfplumber.open(pdf_path) as pdf:
                if page_num >= len(pdf.pages):
                    return ""
                page = pdf.pages[page_num]

                parts = []

                raw_text = page.extract_text(x_tolerance=3, y_tolerance=3)
                if raw_text and raw_text.strip():
                    parts.append(raw_text.strip())

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

    def _render_pdf_page_to_pil(self, page, dpi: int = 250) -> Optional["Image.Image"]:
        """
        Render a single PDF page to a PIL Image using PyMuPDF.
        """
        try:
            from PIL import Image
            import io

            zoom = dpi / 72  # 72 is PDF base DPI
            mat = fitz.Matrix(zoom, zoom)
            pix = page.get_pixmap(matrix=mat, colorspace=fitz.csRGB, alpha=False)
            img_bytes = pix.tobytes("png")
            return Image.open(io.BytesIO(img_bytes))
        except Exception as e:
            print(f"    [ERROR] PyMuPDF page render failed: {e}")
            return None

    def _extract_ocr_text(self, page) -> str:
        if not ocr_service.ocr_enabled:
            return ""
        try:
            pil_image = self._render_pdf_page_to_pil(page, dpi=300)
            if pil_image is None:
                return "[OCR failed - could not render page]"

            text = ocr_service.extract_text_from_image(pil_image)
            if text and text not in ("[OCR not available]", "[OCR failed]"):
                return text
        except Exception as e:
            print(f"    [WARNING] OCR failed: {e}")
        return ""
