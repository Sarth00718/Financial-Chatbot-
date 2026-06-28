#!/bin/bash
set -e

echo "Installing Python dependencies for Cloud OCR..."
pip install --upgrade pip setuptools wheel
pip install -r requirements.txt

echo "Build completed successfully!"
echo "OCR Provider: Cloud-based (no local Tesseract installation needed)"

