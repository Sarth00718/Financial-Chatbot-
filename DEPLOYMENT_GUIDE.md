# Financial ChatBot - Deployment Guide

This guide will help you deploy your Financial ChatBot to Vercel and Render.

## Deployment Architecture

```
Frontend (React + Vite) → Vercel
Node.js Backend → Render
Python Backend (FastAPI) → Render
```

---

## Prerequisites

1. **GitHub Repository**: Push your code to GitHub
2. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
3. **Render Account**: Sign up at [render.com](https://render.com)
4. **MongoDB Atlas**: Create a free cluster at [mongodb.com/atlas](https://mongodb.com/atlas)

---

## Step 1: Prepare Your Repository

### 1.1 Push Code to GitHub

```bash
git init
git add .
git commit -m "Initial commit for Financial ChatBot deployment"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/financial-chatbot.git
git push -u origin main
```

### 1.2 Update Environment Files

**Fill in your actual values:**

- `Frontend/.env.production` - Update `VITE_API_BASE_URL`
- `Backend/.env.production` - Update database URI, JWT secrets, API keys
- `Python-Backend/.env.production` - Update API keys

---

## Step 2: Deploy Frontend to Vercel

### 2.1 Connect Vercel to Your Repository

1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Click **"Add New..." → "Project"**
3. Import your GitHub repository
4. Select the `Frontend` folder as root directory

### 2.2 Configure Environment Variables

In Vercel Dashboard:
1. Go to **Settings → Environment Variables**
2. Add: `VITE_API_BASE_URL` = `https://your-nodejs-backend.onrender.com`
3. Click **Deploy**

### 2.3 Build Settings

- **Framework Preset**: Vite
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`

---

## Step 3: Deploy Node.js Backend to Render

### 3.1 Prepare Backend for Render

Update `Backend/src/server.js` to use environment variables:

```javascript
// Make sure PORT is configurable
const PORT = process.env.PORT || 8000;

// Make sure CORS_ORIGIN is from environment
const CORS_ORIGIN = process.env.CORS_ORIGIN || "http://localhost:5173";
```

### 3.2 Create Render Web Service

1. Go to [render.com](https://render.com) dashboard
2. Click **"New +" → "Web Service"**
3. Connect your GitHub repository
4. **Configuration:**
   - **Name**: `financial-chatbot-backend`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Root Directory**: `Backend`

### 3.3 Add Environment Variables

In Render Dashboard:
1. Go to **Environment** tab
2. Add all variables from `Backend/.env.production`:
   - `MONGODB_URI` (MongoDB Atlas connection string)
   - `NODE_ENV=production`
   - `JWT_SECRET` (generate: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`)
   - `JWT_REFRESH_SECRET` (generate same way)
   - `GROQ_API_KEY`
   - `CORS_ORIGIN=https://your-frontend.vercel.app`
   - `NODE_WEBHOOK_URL=https://your-nodejs-backend.onrender.com`

### 3.4 Deploy

Click **Deploy Web Service**

---

## Step 4: Deploy Python Backend to Render

### 4.1 Create Render Web Service for Python

1. Go to [render.com](https://render.com) dashboard
2. Click **"New +" → "Web Service"**
3. Connect your GitHub repository
4. **Configuration:**
   - **Name**: `financial-chatbot-python`
   - **Environment**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - **Root Directory**: `Python-Backend`

### 4.2 Add System Dependencies

Create `Python-Backend/build.sh`:

```bash
#!/bin/bash
set -e

# Install system dependencies (tesseract for OCR)
apt-get update
apt-get install -y tesseract-ocr

# Install Python dependencies
pip install -r requirements.txt
```

In Render Dashboard, add to **Build Command**:
```
chmod +x build.sh && ./build.sh
```

### 4.3 Add Environment Variables

In Render Dashboard:
1. Go to **Environment** tab
2. Add all variables from `Python-Backend/.env.production`:
   - `GROQ_API_KEY`
   - `LLM_MODEL=llama-3.1-8b-instant`
   - `EMBEDDING_MODEL=sentence-transformers/all-MiniLM-L6-v2`
   - `NODE_WEBHOOK_URL=https://your-nodejs-backend.onrender.com`
   - `TESSERACT_CMD=/usr/bin/tesseract`

### 4.4 Deploy

Click **Deploy Web Service**

---

## Step 5: Update API Endpoints

### 5.1 Update Frontend API Calls

Update your React components to use environment variable:

```javascript
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

// In API calls:
const response = await axios.get(`${API_BASE_URL}/api/endpoint`);
```

### 5.2 Update Backend Backend Calls

If Node backend calls Python backend:

```javascript
const PYTHON_API_URL = process.env.PYTHON_BACKEND_URL || 'http://localhost:5000';

// In API calls:
const response = await axios.post(`${PYTHON_API_URL}/api/endpoint`, data);
```

---

## Step 6: MongoDB Atlas Setup

### 6.1 Create Cluster

1. Go to [mongodb.com/atlas](https://mongodb.com/atlas)
2. Create a new project
3. Create a new cluster (free tier available)
4. Create database user and password

### 6.2 Get Connection String

1. Click **Connect**
2. Choose **Connect your application**
3. Copy the connection string
4. Replace `<password>` and `<username>` with your credentials
5. Add to `MONGODB_URI` in Render environment variables

---

## Step 7: Custom Domain (Optional)

### For Vercel Frontend:
1. Go to **Settings → Domains**
2. Add your custom domain
3. Configure DNS settings

### For Render Backend:
1. Go to **Settings → Custom Domain**
2. Add your domain
3. Add CNAME record to your DNS provider

---

## Environment Variables Summary

### Frontend (Vercel)
```
VITE_API_BASE_URL=https://your-nodejs-backend.onrender.com
```

### Node Backend (Render)
```
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/dbname
NODE_ENV=production
JWT_SECRET=<generate-random-secret>
JWT_REFRESH_SECRET=<generate-random-secret>
GROQ_API_KEY=<your-api-key>
CORS_ORIGIN=https://your-frontend.vercel.app
NODE_WEBHOOK_URL=https://your-nodejs-backend.onrender.com
TESSERACT_CMD=/usr/bin/tesseract
```

### Python Backend (Render)
```
GROQ_API_KEY=<your-api-key>
LLM_MODEL=llama-3.1-8b-instant
EMBEDDING_MODEL=sentence-transformers/all-MiniLM-L6-v2
NODE_WEBHOOK_URL=https://your-nodejs-backend.onrender.com
TESSERACT_CMD=/usr/bin/tesseract
```

---

## Troubleshooting

### Frontend Not Building
- Check `Frontend/vite.config.js` is properly configured
- Ensure all npm dependencies are in `package.json`
- Check build logs in Vercel dashboard

### Node Backend Not Starting
- Verify `Backend/src/server.js` exists
- Check database connection string in environment
- View logs in Render dashboard: **Logs** tab

### Python Backend Issues
- Check Python version compatibility
- Verify all packages in `requirements.txt`
- Tesseract might need additional build time
- View logs in Render dashboard

### CORS Errors
- Ensure `CORS_ORIGIN` matches frontend URL in Node backend
- Check Socket.IO CORS configuration

### Socket.IO Connection Issues
- Update Socket.IO connection URL in frontend
- Add WebSocket support in Render (should be automatic)

---

## Testing Deployment

1. **Frontend**: Visit your Vercel domain
2. **Backend API**: Test with Postman or curl:
   ```bash
   curl https://your-nodejs-backend.onrender.com/api/health
   ```
3. **Python API**: 
   ```bash
   curl https://your-python-backend.onrender.com/health
   ```

---

## Monitoring & Logs

### Vercel
- Dashboard → Deployments → View logs

### Render
- Dashboard → Service → Logs tab

---

## Next Steps

1. Test all API endpoints
2. Monitor logs for errors
3. Set up error tracking (e.g., Sentry)
4. Configure domain name
5. Set up SSL certificate (automatic on Vercel/Render)

---

## Support Resources

- [Vercel Docs](https://vercel.com/docs)
- [Render Docs](https://render.com/docs)
- [MongoDB Atlas Docs](https://docs.mongodb.com/atlas)
- [Groq API Docs](https://console.groq.com/docs)
