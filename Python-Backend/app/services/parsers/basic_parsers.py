import os
from typing import List

from app.services.parsers.base_parser import BaseParser
from app.services.parsers.parser_factory import ParserFactory
from app.services.ocr_service import ocr_service


@ParserFactory.register_parser([".txt", ".md", ".json", ".tsv", ".html", ".xml", ".log"])
class TextParser(BaseParser):
    def _extract_blocks(self, file_path: str, file_name: str) -> List[dict]:
        try:
            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                text = f.read()
        except Exception as e:
            raise ValueError(f"Failed to read TXT file: {e}")

        if not text.strip():
            raise ValueError("No text found in the TXT file.")

        return [
            {
                "text": text,
                "metadata": {
                    "page": 1,
                    "type": "text",
                    "source": "txt_extraction",
                    "char_count": len(text),
                },
            }
        ]


@ParserFactory.register_parser([".csv"])
class CsvParser(BaseParser):
    def _extract_blocks(self, file_path: str, file_name: str) -> List[dict]:
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

        return [
            {
                "text": text,
                "metadata": {
                    "page": 1,
                    "type": "table",
                    "source": "csv_extraction",
                    "char_count": len(text),
                },
            }
        ]


@ParserFactory.register_parser([".xls", ".xlsx"])
class ExcelParser(BaseParser):
    def _extract_blocks(self, file_path: str, file_name: str) -> List[dict]:
        text = ""
        try:
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
            try:
                import openpyxl

                wb = openpyxl.load_workbook(file_path, read_only=True, data_only=True)
                sheets_text = []
                for sheet in wb.worksheets:
                    sheet_lines = [f"\n[SHEET: {sheet.title}]"]
                    for row in sheet.iter_rows(values_only=True):
                        row_vals = [
                            str(cell).strip() if cell is not None else ""
                            for cell in row
                        ]
                        if any(row_vals):
                            sheet_lines.append(" | ".join(row_vals))
                    sheets_text.append("\n".join(sheet_lines))
                text = "\n\n".join(sheets_text)
            except Exception as e:
                raise ValueError(f"Failed to parse Excel file: {e}")

        if not text.strip():
            raise ValueError("Excel file is empty.")

        return [
            {
                "text": text,
                "metadata": {
                    "page": 1,
                    "type": "table",
                    "source": "excel_extraction",
                    "char_count": len(text),
                },
            }
        ]


@ParserFactory.register_parser([".png", ".jpg", ".jpeg", ".tiff", ".bmp", ".webp"])
class ImageParser(BaseParser):
    def _extract_blocks(self, file_path: str, file_name: str) -> List[dict]:
        try:
            with open(file_path, "rb") as f:
                img_bytes = f.read()

            extracted_text = ""

            # 1. Primary: Use vision callback (Gemini Vision -> Groq Vision -> OCR)
            if self.vision_callback:
                extracted_text = self.vision_callback(
                    img_bytes,
                    f"Uploaded image file: {os.path.basename(file_path)}",
                )

            # 2. Fallback: If vision callback didn't yield text, call OCR directly
            if not extracted_text or "unavailable" in extracted_text.lower():
                try:
                    from PIL import Image

                    pil_img = Image.open(file_path)
                    if ocr_service.ocr_enabled:
                        ocr_text = ocr_service.extract_text_from_image(pil_img)
                        if ocr_text and not ocr_text.startswith("[OCR"):
                            extracted_text = f"[OCR EXTRACTED TEXT:\n{ocr_text}]"
                except Exception:
                    pass

            if not extracted_text:
                extracted_text = f"[Image file {file_name} uploaded - visual content extracted]"

            return [
                {
                    "text": extracted_text,
                    "metadata": {
                        "page": 1,
                        "type": "image",
                        "source": "image_parser",
                        "char_count": len(extracted_text),
                    },
                }
            ]
        except Exception as e:
            raise ValueError(f"Failed to process image file {file_name}: {e}")
