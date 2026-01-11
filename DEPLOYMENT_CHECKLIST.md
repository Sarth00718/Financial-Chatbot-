# FinChatBot - Deployment Checklist

## 📋 Pre-Deployment Checklist

### 1. Accounts & Services Setup

#### MongoDB Database
- [ ] MongoDB Atlas account created
- [ ] Free M0 cluster created
- [ ] Database user created with password
- [ ] Network access configured (0.0.0.0/0 for cloud)
- [ ] Connection string copied
- [ ] Test connection successful

#### API Keys
- [ ] Groq API key obtained (https://console.groq.com/keys)
- [ ] Google Gemini API key obtained (https://makersuite.google.com/app/apikey)
- [ ] Both API keys tested and working
- [ ] API keys stored securely

#### Email Service
- [ ] Gmail account ready
- [ ] 2-Factor Authentication enabled
- [ ] App Password generated (16 characters)
- [ ] Email sending tested

#### Hosting Accounts
- [ ] Render.com account created (for Backend & Python)
- [ ] Vercel.com account created (for Frontend)
- [ ] GitHub repository ready
- [ ] All code pushed to GitHub

---

## 🔧 Local Development Checklist

### Backend (Node.js)
- [ ] Node.js v18+ installed
- [ ] Navigate to `Backend` folder
- [ ] Run `npm install`
- [ ] Create `.env` file from `.env.example`
- [ ] Configure all environment variables:
  - [ ] PORT=8000
  - [ ] MONGODB_URI (Atlas connection string)
  - [ ] CORS_ORIGIN=http://localhost:5173
  - [ ] JWT_SECRET (strong random string)
  - [ ] ACCESS_TOKEN_SECRET (strong random string)
  - [ ] REFRESH_TOKEN_SECRET (strong random string)
  - [ ] EMAIL_ID_FOR_VERIFICATION
  - [ ] EMAIL_PASSWORD_FOR_VERIFICATION
  - [ ] PYTHON_SERVICE_URL=http://localhost:5000
- [ ] Run `npm run dev`
- [ ] Backend running on http://localhost:8000
- [ ] Test health endpoint: http://localhost:8000/api/v1/health

### Python AI Service
- [ ] Python 3.9+ installed
- [ ] Navigate to `Python-Backend` folder
- [ ] Create virtual environment: `python -m venv venv`
- [ ] Activate virtual environment
- [ ] Run `pip install -r requirements.txt`
- [ ] Create `.env` file from `.env.example`
- [ ] Configure all environment variables:
  - [ ] GROQ_API_KEY
  - [ ] GOOGLE_API_KEY
  - [ ] NODE_WEBHOOK_URL=http://localhost:8000
  - [ ] PORT=5000
- [ ] Run `python app/main.py`
- [ ] Python service running on http://localhost:5000
- [ ] Test health endpoint: http://localhost:5000/health
- [ ] Check API docs: http://localhost:5000/docs

### Frontend (React)
- [ ] Node.js v18+ installed
- [ ] Navigate to `Frontend` folder
- [ ] Run `npm install`
- [ ] Create `.env` file from `.env.example`
- [ ] Configure environment variable:
  - [ ] VITE_API_URL=http://localhost:8000/api/v1
- [ ] Run `npm run dev`
- [ ] Frontend running on http://localhost:5173
- [ ] Website loads correctly
- [ ] Logo displays properly

### Local Testing
- [ ] All three services running simultaneously
- [ ] Register new user account
- [ ] Receive verification email
- [ ] Verify email and login
- [ ] Create new conversation
- [ ] Upload test document (PDF or Excel)
- [ ] Document processes successfully
- [ ] Ask question about document
- [ ] Receive AI response
- [ ] Test on mobile view (DevTools)
- [ ] No console errors

---

## ☁️ Cloud Deployment Checklist

### Step 1: Deploy Python AI Service (Render)

- [ ] Login to Render.com
- [ ] Click "New +" → "Web Service"
- [ ] Connect GitHub repository
- [ ] Configure service:
  - [ ] Name: `finchatbot-ai`
  - [ ] Region: Select closest
  - [ ] Branch: `main`
  - [ ] Root Directory: `Python-Backend`
  - [ ] Runtime: Python 3
  - [ ] Build Command: `pip install -r requirements.txt`
  - [ ] Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- [ ] Add environment variables:
  - [ ] GROQ_API_KEY
  - [ ] GOOGLE_API_KEY
  - [ ] NODE_WEBHOOK_URL (will update later)
  - [ ] PORT=5000
- [ ] Click "Create Web Service"
- [ ] Wait for deployment to complete
- [ ] Copy service URL (e.g., https://finchatbot-ai.onrender.com)
- [ ] Test health endpoint: https://your-url.onrender.com/health
- [ ] Verify API docs work: https://your-url.onrender.com/docs

### Step 2: Deploy Backend (Render)

- [ ] Click "New +" → "Web Service"
- [ ] Connect GitHub repository
- [ ] Configure service:
  - [ ] Name: `finchatbot-backend`
  - [ ] Region: Select closest
  - [ ] Branch: `main`
  - [ ] Root Directory: `Backend`
  - [ ] Runtime: Node
  - [ ] Build Command: `npm install`
  - [ ] Start Command: `npm start`
- [ ] Add environment variables:
  - [ ] PORT=8000
  - [ ] MONGODB_URI (MongoDB Atlas connection string)
  - [ ] CORS_ORIGIN (will update after frontend deployment)
  - [ ] JWT_SECRET (generate strong 32+ char string)
  - [ ] ACCESS_TOKEN_SECRET (generate strong 32+ char string)
  - [ ] ACCESS_TOKEN_EXPIRY=1d
  - [ ] REFRESH_TOKEN_SECRET (generate strong 32+ char string)
  - [ ] REFRESH_TOKEN_EXPIRY=10d
  - [ ] EMAIL_ID_FOR_VERIFICATION
  - [ ] EMAIL_PASSWORD_FOR_VERIFICATION
  - [ ] PYTHON_SERVICE_URL (Python AI URL from Step 1)
- [ ] Click "Create Web Service"
- [ ] Wait for deployment to complete
- [ ] Copy service URL (e.g., https://finchatbot-backend.onrender.com)
- [ ] Test health endpoint: https://your-url.onrender.com/api/v1/health

### Step 3: Update Python AI Service

- [ ] Go back to Python AI service on Render
- [ ] Update environment variable:
  - [ ] NODE_WEBHOOK_URL=https://finchatbot-backend.onrender.com
- [ ] Save changes (auto-redeploys)

### Step 4: Deploy Frontend (Vercel)

- [ ] Login to Vercel.com
- [ ] Click "Add New" → "Project"
- [ ] Import GitHub repository
- [ ] Configure project:
  - [ ] Framework Preset: Vite
  - [ ] Root Directory: `Frontend`
  - [ ] Build Command: `npm run build`
  - [ ] Output Directory: `dist`
  - [ ] Install Command: `npm install`
- [ ] Add environment variable:
  - [ ] VITE_API_URL=https://finchatbot-backend.onrender.com/api/v1
- [ ] Click "Deploy"
- [ ] Wait for deployment (2-3 minutes)
- [ ] Copy deployment URL (e.g., https://finchatbot.vercel.app)
- [ ] Test website loads

### Step 5: Update Backend CORS

- [ ] Go back to Backend service on Render
- [ ] Update environment variable:
  - [ ] CORS_ORIGIN=https://finchatbot.vercel.app
- [ ] Save changes (auto-redeploys)
- [ ] Wait for redeployment

---

## 🧪 Production Testing Checklist

### Frontend Testing
- [ ] Website loads at production URL
- [ ] Logo displays correctly
- [ ] Responsive design works (test on phone)
- [ ] All pages accessible (login, register, chat)
- [ ] No console errors (F12)
- [ ] HTTPS enabled (padlock icon)

### Authentication Testing
- [ ] Register new account
- [ ] Verification email received
- [ ] Email link works
- [ ] Login successful
- [ ] Logout works
- [ ] Token refresh works

### Chat Functionality
- [ ] Create new conversation
- [ ] Conversation appears in sidebar
- [ ] Upload PDF document
- [ ] Document processes successfully
- [ ] Upload Excel document
- [ ] Excel processes successfully
- [ ] Ask question about document
- [ ] AI response received (< 5 seconds)
- [ ] Response is relevant and accurate
- [ ] Markdown formatting works
- [ ] Code blocks render correctly

### Real-Time Features
- [ ] Messages appear instantly
- [ ] Document status updates in real-time
- [ ] No lag or delays
- [ ] WebSocket connection stable

### Mobile Testing
- [ ] Test on real iPhone/Android device
- [ ] Sidebar slides in/out smoothly
- [ ] Touch targets are adequate
- [ ] Text is readable
- [ ] File upload works
- [ ] Keyboard doesn't cover input
- [ ] Orientation changes work

### Performance Testing
- [ ] Page load time < 3 seconds
- [ ] AI response time < 5 seconds
- [ ] Document processing completes
- [ ] No memory leaks
- [ ] Smooth scrolling

---

## 🔒 Security Checklist

### Environment Variables
- [ ] All secrets are strong (32+ characters)
- [ ] No default values in production
- [ ] JWT secrets are unique
- [ ] API keys are valid
- [ ] No .env files committed to Git

### CORS Configuration
- [ ] CORS_ORIGIN set to specific domain (not *)
- [ ] No wildcard origins in production
- [ ] Backend only accepts requests from frontend

### Database Security
- [ ] MongoDB user has strong password
- [ ] Network access properly configured
- [ ] Database name is not default
- [ ] Connection string is secure

### HTTPS/SSL
- [ ] Frontend uses HTTPS (automatic with Vercel)
- [ ] Backend uses HTTPS (automatic with Render)
- [ ] No mixed content warnings
- [ ] SSL certificate valid

### API Security
- [ ] Rate limiting enabled (if applicable)
- [ ] Input validation working
- [ ] File upload size limits enforced
- [ ] Authentication required for protected routes

---

## 📊 Monitoring Setup

### Error Tracking
- [ ] Consider setting up Sentry (optional)
- [ ] Monitor error logs in Render dashboard
- [ ] Check Vercel deployment logs

### Uptime Monitoring
- [ ] Set up UptimeRobot (free) for monitoring
- [ ] Add frontend URL
- [ ] Add backend health endpoint
- [ ] Configure email alerts

### Analytics
- [ ] Consider Google Analytics (optional)
- [ ] Track user registrations
- [ ] Monitor document uploads
- [ ] Track AI query usage

---

## 🎯 Post-Deployment Tasks

### Documentation
- [ ] Update README with production URLs
- [ ] Document any custom configurations
- [ ] Create user guide (if needed)
- [ ] Document API endpoints

### Backup Strategy
- [ ] MongoDB Atlas automatic backups enabled
- [ ] Code backed up in GitHub
- [ ] Environment variables documented securely

### Maintenance Plan
- [ ] Schedule regular dependency updates
- [ ] Monitor API usage and limits
- [ ] Check logs weekly
- [ ] Test critical features monthly

---

## 🚨 Rollback Plan

If deployment fails:

1. **Frontend Issues**
   - [ ] Revert to previous Vercel deployment
   - [ ] Check environment variables
   - [ ] Review build logs

2. **Backend Issues**
   - [ ] Revert to previous Render deployment
   - [ ] Check environment variables
   - [ ] Review service logs
   - [ ] Verify MongoDB connection

3. **Python Service Issues**
   - [ ] Revert to previous Render deployment
   - [ ] Check API keys
   - [ ] Review service logs
   - [ ] Test API endpoints

---

## ✅ Final Verification

### All Services Running
- [ ] Frontend: https://your-app.vercel.app
- [ ] Backend: https://your-backend.onrender.com
- [ ] Python AI: https://your-ai.onrender.com
- [ ] MongoDB: Connected and accessible

### All Features Working
- [ ] User registration ✅
- [ ] Email verification ✅
- [ ] Login/Logout ✅
- [ ] Document upload ✅
- [ ] Document processing ✅
- [ ] AI chat ✅
- [ ] Real-time updates ✅
- [ ] Mobile responsive ✅

### Performance Acceptable
- [ ] Page load < 3s ✅
- [ ] AI response < 5s ✅
- [ ] No errors in logs ✅
- [ ] Smooth user experience ✅

---

## 🎉 Deployment Complete!

**Congratulations! Your FinChatBot is now live!** 🚀

### Share Your App
- Frontend URL: `https://your-app.vercel.app`
- Share with users
- Collect feedback
- Monitor usage

### Next Steps
1. Monitor performance and errors
2. Gather user feedback
3. Plan feature enhancements
4. Keep dependencies updated
5. Scale as needed

---

## 📞 Support Resources

- **Render Docs**: https://render.com/docs
- **Vercel Docs**: https://vercel.com/docs
- **MongoDB Atlas Docs**: https://docs.atlas.mongodb.com/
- **Groq Docs**: https://console.groq.com/docs
- **Gemini Docs**: https://ai.google.dev/docs

---

**Need help? Check the logs first, then review environment variables!**
