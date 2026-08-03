"""
OCR Service
Handles OCR for images using OCR.Space Cloud API.
"""

import io
import requests
from typing import Optional
from PIL import Image


class OCRService:
    """
    OCR extraction service using OCR.Space Cloud API.
    Expects pre-rendered images (e.g., from a parser).
    """

    def __init__(self):
        from app.core.settings import settings

        self.ocr_space_api_key = settings.OCR_SPACE_API_KEY
        self.ocr_enabled = bool(self.ocr_space_api_key)

        if not self.ocr_enabled:
            print(
                "[WARNING] OCR.Space API key not configured; OCR.Space will be disabled"
            )
        else:
            print("[INIT] OCR service configured: OCR.Space")

    def preprocess_image_for_ocr(self, pil_image: Image.Image) -> Optional[bytes]:
        """Convert PIL image to bytes for cloud OCR."""
        try:
            img_byte_arr = io.BytesIO()
            pil_image.save(img_byte_arr, format="PNG")
            img_byte_arr.seek(0)
            return img_byte_arr.getvalue()
        except Exception as e:
            print(f"    [WARNING] Image preprocessing failed: {e}")
            return None

    def extract_text_from_image_bytes(self, image_bytes: bytes) -> str:
        """
        Call OCR.Space API to extract text from raw image bytes.
        """
        if not self.ocr_enabled:
            return "[OCR disabled]"

        try:
            url = "https://api.ocr.space/parse/image"
            files = {"filename": image_bytes}
            payload = {
                "apikey": self.ocr_space_api_key,
                "language": "eng",
                "isOverlayRequired": False,
            }

            response = requests.post(url, files=files, data=payload, timeout=30)
            result = response.json()

            if result.get("IsErroredOnProcessing"):
                error_msg = result.get("ErrorMessage", ["Unknown error"])[0]
                print(f"    [ERROR] OCR.Space API error: {error_msg}")
                return "[OCR failed]"

            text = result.get("ParsedText", "")
            return text.strip()

        except Exception as e:
            print(f"    [ERROR] OCR.Space API call failed: {e}")
            return "[OCR failed]"

    def extract_text_from_image(self, image: Image.Image) -> str:
        """Run cloud OCR on a PIL Image."""
        if not self.ocr_enabled:
            return "[OCR disabled]"

        try:
            image_bytes = self.preprocess_image_for_ocr(image)
            if not image_bytes:
                return "[OCR failed - image processing error]"

            return self.extract_text_from_image_bytes(image_bytes)

        except Exception as e:
            print(f"    [ERROR] OCR extraction failed: {e}")
            return "[OCR failed]"

    def should_use_ocr(self, text_length: int, has_images: bool) -> bool:
        """
        Returns True when OCR is worth attempting based on page text length and image presence.
        """
        if not self.ocr_enabled:
            return False
        return text_length < 50 or (has_images and text_length < 200)


# Singleton
ocr_service = OCRService()
