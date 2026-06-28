# Cloud OCR Configuration Guide

This guide explains how to configure and use Cloud OCR APIs instead of Tesseract.

## Why Cloud OCR?

- ✅ No system dependencies (no Tesseract installation needed)
- ✅ Works on any platform (Windows, Linux, macOS)
- ✅ Better OCR accuracy with modern AI models
- ✅ Easy deployment (no complex build scripts)
- ✅ Free/low-cost options available
- ✅ Scales automatically on cloud platforms

---

## OCR Provider Options

### 1. **OCR.Space (Recommended for getting started)**

**Best for:** Free tier, no authentication, good accuracy

**Features:**
- 25,000 free API calls/month
- No authentication required for free tier
- Good OCR accuracy
- Simple API

**Setup:**
```env
OCR_PROVIDER=ocr_space
OCR_SPACE_API_KEY=K87899142  # Free tier key (default)
```

**Upgrade to Paid Tier (optional):**
1. Visit https://ocr.space/ocrapi
2. Sign up for paid plan
3. Get your API key
4. Update `OCR_SPACE_API_KEY` in `.env`

**Pricing:** Free tier (25,000 calls/month) or paid starting at $9.99/month

**API Docs:** https://ocr.space/ocrapi

---

### 2. **Google Cloud Vision**

**Best for:** High accuracy, enterprise use, complex documents

**Features:**
- Very accurate OCR
- Multiple language support
- Can process images, PDFs, video
- Pay-per-use pricing

**Setup:**

1. Create Google Cloud Project:
   - Go to https://console.cloud.google.com
   - Create new project
   - Enable Cloud Vision API

2. Create Service Account:
   - Go to Credentials → Create Credentials → Service Account
   - Create JSON key file
   - Download the key

3. Set API Key:
   ```env
   OCR_PROVIDER=google_vision
   GOOGLE_VISION_API_KEY=your_api_key_or_service_account_json
   ```

4. Install client library (if not already installed):
   ```bash
   pip install google-cloud-vision
   ```

**Pricing:** 
- First 1,000 requests/month free
- $1.50 per 1,000 requests after that

**API Docs:** https://cloud.google.com/vision/docs

---

### 3. **Azure AI Vision**

**Best for:** Microsoft ecosystem, enterprise integrations

**Features:**
- Excellent OCR accuracy
- Support for multiple languages
- Integrated with Azure ecosystem
- Async API (good for batch processing)

**Setup:**

1. Create Azure Account:
   - Go to https://azure.microsoft.com
   - Create free account (gets $200 credits)

2. Create Computer Vision Resource:
   - Search for "Computer Vision" in Azure Portal
   - Create new resource
   - Select region and pricing tier

3. Get Credentials:
   - Go to resource → Keys and Endpoint
   - Copy API Key and Endpoint URL

4. Set Configuration:
   ```env
   OCR_PROVIDER=azure_vision
   AZURE_VISION_API_KEY=your_api_key
   AZURE_VISION_ENDPOINT=https://your-region.api.cognitive.microsoft.com
   ```

5. Install client library (if not already installed):
   ```bash
   pip install azure-cognitiveservices-vision-computervision
   ```

**Pricing:**
- Free tier: 5,000 transactions/month
- Standard tier: $1-10 per 1,000 requests depending on volume

**API Docs:** https://learn.microsoft.com/en-us/azure/ai-services/computer-vision/

---

### 4. **AWS Textract (Alternative)**

**Note:** Not yet integrated, but can be added

**Features:**
- Excellent table/form extraction
- Good for scanned documents
- Can detect handwriting

**To Add Support:**
```bash
pip install boto3
```

Then implement `aws_textract_extract_text()` method in `ocr_service.py`

---

## Configuration in Your Project

### Local Development

Edit `Python-Backend/.env`:

```env
# Choose provider
OCR_PROVIDER=ocr_space

# OCR.Space settings
OCR_SPACE_API_KEY=K87899142

# Google Vision settings (if using)
GOOGLE_VISION_API_KEY=your_key_here

# Azure Vision settings (if using)
AZURE_VISION_API_KEY=your_key_here
AZURE_VISION_ENDPOINT=https://your-region.api.cognitive.microsoft.com
```

### Production (Render)

1. Go to your Python Backend service on Render
2. Go to **Environment** tab
3. Add the variables from your chosen provider

**Example for OCR.Space:**
```
OCR_PROVIDER=ocr_space
OCR_SPACE_API_KEY=K87899142
```

**Example for Google Cloud Vision:**
```
OCR_PROVIDER=google_vision
GOOGLE_VISION_API_KEY=<your-api-key>
```

---

## Testing Your OCR Setup

### Test Locally

```python
from app.services.ocr_service import ocr_service
from PIL import Image

# Load a test image
test_image = Image.open("path/to/test/image.png")

# Extract text
text = ocr_service.extract_text_from_image(test_image)
print(text)
```

### Test via API

```bash
curl -X POST http://localhost:5000/api/ocr \
  -F "file=@test-image.png"
```

---

## Switching Providers

### From OCR.Space to Google Vision

1. Get Google Vision API key (see setup above)
2. Update `.env`:
   ```env
   OCR_PROVIDER=google_vision
   GOOGLE_VISION_API_KEY=your_key_here
   ```
3. Install library if needed: `pip install google-cloud-vision`
4. Restart your app

### From Google Vision to Azure

1. Get Azure credentials (see setup above)
2. Update `.env`:
   ```env
   OCR_PROVIDER=azure_vision
   AZURE_VISION_API_KEY=your_key_here
   AZURE_VISION_ENDPOINT=https://your-region.api.cognitive.microsoft.com
   ```
3. Restart your app

---

## Troubleshooting

### "OCR disabled" error

**Cause:** PyMuPDF not installed or OCR provider not configured

**Fix:**
```bash
pip install pymupdf
# Then check your OCR_PROVIDER setting
```

### OCR.Space: "API error"

**Cause:** Free tier rate limit exceeded or invalid API key

**Fix:**
- Wait before making more requests
- Sign up for paid tier at https://ocr.space/ocrapi

### Google Vision: "Permission denied"

**Cause:** Missing or invalid API credentials

**Fix:**
1. Verify API key: `echo $GOOGLE_VISION_API_KEY`
2. Regenerate key in Google Cloud Console
3. Update `.env` and restart

### Azure: "Timeout"

**Cause:** Azure Vision API taking too long to process image

**Fix:**
- Check image quality/size
- Azure uses async API, retry count may need increase
- Try with smaller/clearer image

---

## Cost Comparison

| Provider | Free Tier | Cost |
|----------|-----------|------|
| **OCR.Space** | 25,000 calls/mo | $9.99+/mo |
| **Google Vision** | 1,000 calls/mo | $1.50 per 1K after |
| **Azure Vision** | 5,000 calls/mo | Variable pricing |

**Recommendation for testing:** Use OCR.Space free tier first, upgrade to Google Vision or Azure for production.

---

## Fallback Strategy

If your cloud OCR provider fails:
1. App logs the error
2. Returns "[OCR failed]" message
3. Document processing continues with other extraction methods
4. No downtime guaranteed

---

## Additional Resources

- [OCR.Space API Docs](https://ocr.space/ocrapi)
- [Google Cloud Vision Docs](https://cloud.google.com/vision/docs)
- [Azure Computer Vision Docs](https://learn.microsoft.com/en-us/azure/ai-services/computer-vision/)
- [PyMuPDF Docs](https://pymupdf.readthedocs.io/) (PDF rendering)

---

## Questions?

Check the deployment guide for environment variable setup:
`DEPLOYMENT_GUIDE.md`

Or see the service implementation:
`Python-Backend/app/services/ocr_service.py`
