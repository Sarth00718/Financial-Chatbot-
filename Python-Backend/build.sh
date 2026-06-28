#!/bin/bash
set -e

echo "Installing system dependencies..."
apt-get update
apt-get install -y \
    tesseract-ocr \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgomp1

echo "Installing Python dependencies..."
pip install --upgrade pip setuptools wheel
pip install -r requirements.txt

echo "Build completed successfully!"
