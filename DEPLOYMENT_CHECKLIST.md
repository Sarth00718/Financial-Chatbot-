# Deployment checklist for Financial ChatBot

## Pre-Deployment Checklist

- [ ] All code pushed to GitHub repository
- [ ] GitHub repository is public or Vercel/Render have access
- [ ] MongoDB Atlas cluster created with connection string
- [ ] All environment variables are set up locally and tested
- [ ] API keys (Groq, OpenRouter) are obtained
- [ ] Frontend builds successfully locally (`npm run build`)
- [ ] Backend runs successfully locally (`npm start`)
- [ ] Python backend runs successfully locally (`python start.py` or `uvicorn app.main:app`)

## Deployment Steps

### 1. Frontend (React) - Vercel
- [ ] Connect GitHub repository to Vercel
- [ ] Select `Frontend` folder as root
- [ ] Set environment variable: `VITE_API_BASE_URL`
- [ ] Deploy
- [ ] Note the Vercel frontend URL

### 2. Node.js Backend - Render
- [ ] Create Web Service on Render
- [ ] Connect GitHub repository
- [ ] Set root directory to `Backend`
- [ ] Use build command: `npm install`
- [ ] Use start command: `npm start`
- [ ] Add all environment variables
- [ ] Update `CORS_ORIGIN` to Vercel frontend URL
- [ ] Deploy
- [ ] Note the Render backend URL

### 3. Python Backend - Render
- [ ] Create Web Service on Render
- [ ] Connect GitHub repository
- [ ] Set root directory to `Python-Backend`
- [ ] Use build command: `chmod +x .render-build.sh && ./.render-build.sh`
- [ ] Use start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- [ ] Add all environment variables
- [ ] Deploy
- [ ] Note the Render Python backend URL

## Post-Deployment Testing

- [ ] Access frontend URL and verify it loads
- [ ] Test backend API endpoints:
  - [ ] Health check endpoint
  - [ ] Authentication endpoints
  - [ ] Data retrieval endpoints
- [ ] Test Python backend:
  - [ ] Health check
  - [ ] Vector search functionality
- [ ] Test WebSocket connection (if applicable)
- [ ] Check error logs on all platforms

## Production Adjustments

- [ ] Update any hardcoded URLs to use environment variables
- [ ] Ensure HTTPS is enabled everywhere
- [ ] Set up custom domains (optional)
- [ ] Configure automatic deployments for each service
- [ ] Set up monitoring/alerts
- [ ] Test error handling and logging

## Important URLs After Deployment

- Frontend: `https://your-frontend.vercel.app`
- Node Backend: `https://your-backend.onrender.com`
- Python Backend: `https://your-python-backend.onrender.com`

## Useful Commands

### Generate JWT Secret
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Test API Endpoints
```bash
curl https://your-backend.onrender.com/api/health
curl https://your-python-backend.onrender.com/health
```

### View Logs
- Vercel: Dashboard → Deployments → Select deployment → Logs
- Render: Dashboard → Select service → Logs tab

### Redeploy
- Vercel: Trigger redeploy from dashboard or push to GitHub
- Render: Dashboard → Select service → Manual Deploy button
