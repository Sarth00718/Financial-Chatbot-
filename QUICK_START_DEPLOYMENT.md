# Quick Start: Deploy with Cloud OCR

## 5-Minute Deployment Checklist

### Step 1: Get Ready ✅
- [ ] Code pushed to GitHub
- [ ] GitHub repo shared with Vercel/Render
- [ ] MongoDB Atlas account ready
- [ ] Vercel account created
- [ ] Render account created

### Step 2: Deploy Frontend to Vercel ✅
```
1. Go to vercel.com/dashboard
2. Import GitHub repo
3. Root Directory: Frontend
4. Deploy
5. Copy frontend URL
```

Environment: `VITE_API_BASE_URL=<your-backend-render-url>`

### Step 3: Deploy Node Backend to Render ✅
```
1. Go to render.com → New Web Service
2. Root Directory: Backend
3. Build: npm install
4. Start: npm start
5. Env vars from Backend/.env.production
6. Deploy
7. Copy backend URL
```

Update: `CORS_ORIGIN=<your-frontend-vercel-url>`

### Step 4: Deploy Python Backend to Render ✅
```
1. Go to render.com → New Web Service
2. Root Directory: Python-Backend
3. Build: pip install -r requirements.txt
4. Start: uvicorn app.main:app --host 0.0.0.0 --port $PORT
5. Deploy
```

**Environment Variables:**
```
GROQ_API_KEY=your_key_here
LLM_MODEL=llama-3.1-8b-instant
EMBEDDING_MODEL=sentence-transformers/all-MiniLM-L6-v2
NODE_WEBHOOK_URL=<your-node-backend-url>

# OCR (choose one)
OCR_PROVIDER=ocr_space
OCR_SPACE_API_KEY=K87899142
```

---

## What's Different About OCR Now?

### Before (Tesseract - Local)
- Complex system installation needed
- Only worked with specific OS versions
- Slow build on cloud platforms

### Now (Cloud OCR - Simple)
- Just add API key to environment
- Works on all platforms instantly
- Zero system dependencies

### Supported Providers

| Provider | Setup | Cost | Accuracy |
|----------|-------|------|----------|
| **OCR.Space** | 1 minute | Free tier included | Good |
| **Google Vision** | 5 minutes | $1.50/1K calls | Excellent |
| **Azure Vision** | 5 minutes | $1-10/1K calls | Excellent |

**Recommendation:** Use `ocr_space` (included, free, no setup)

---

## Verify Deployment

### Frontend
```bash
# Visit your Vercel URL
https://your-frontend.vercel.app
```

### Backend API
```bash
curl https://your-backend.onrender.com/api/health
```

### Python Backend
```bash
curl https://your-python-backend.onrender.com/health
```

### Check Logs
- **Vercel**: Dashboard → Deployments → Logs
- **Render**: Dashboard → Service → Logs

---

## Need Help?

📖 **Full OCR Setup Guide:** `OCR_CONFIGURATION_GUIDE.md`
📖 **Complete Deployment Guide:** `DEPLOYMENT_GUIDE.md`
📖 **What Changed Summary:** `MIGRATION_SUMMARY.md`

---

## Common Issues & Fixes

| Issue | Solution |
|-------|----------|
| Frontend can't connect | Check `VITE_API_BASE_URL` in Vercel |
| Backend returns 500 | Check MongoDB connection + env vars |
| OCR not working | Verify `OCR_PROVIDER` and API key in Render |
| CORS error | Ensure backend `CORS_ORIGIN` matches frontend URL |

---

## Next Steps

1. ✅ Deploy all three services
2. ✅ Test API endpoints
3. ✅ Monitor logs for errors
4. ✅ Add custom domain (optional)
5. ✅ Set up monitoring (optional)

**That's it! Your app is deployed!** 🚀
