# FinChatBot - Complete Deployment Guide

## 🚀 Deployment Options Overview

This guide covers multiple deployment strategies:
1. **Local Deployment** (Development/Testing)
2. **Cloud Deployment** (Production - Recommended)
3. **VPS Deployment** (Self-hosted)

---

## 📋 Pre-Deployment Checklist

### Required Accounts & Services
- [ ] MongoDB Atlas account (free tier available)
- [ ] Groq API key ([Get here](https://console.groq.com/keys))
- [ ] Google Gemini API key ([Get here](https://makersuite.google.com/app/apikey))
- [ ] Gmail account with App Password (for email verification)
- [ ] Hosting accounts (see options below)

### Required Software (Local Development)
- [ ] Node.js v18+ ([Download](https://nodejs.org/))
- [ ] Python 3.9+ ([Download](https://www.python.org/))
- [ ] Git ([Download](https://git-scm.com/))

---

## 1️⃣ LOCAL DEPLOYMENT (Development)

### Step 1: Clone & Setup

```bash
# Clone your repository
git clone <your-repo-url>
cd Financial-ChatBot-main

# Or if already cloned, navigate to the directory
cd Financial-ChatBot-main
```

### Step 2: Setup MongoDB

**Option A: MongoDB Atlas (Recommended)**

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create free account
3. Create a new cluster (Free M0 tier)
4. Click "Connect" → "Connect your application"
5. Copy connection string (looks like: `mongodb+srv://username:password@cluster.mongodb.net`)
6. Replace `<password>` with your actual password

**Option B: Local MongoDB**

```bash
# Windows (Download installer)
https://www.mongodb.com/try/download/community

# Mac (using Homebrew)
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community

# Linux (Ubuntu)
sudo apt-get install mongodb
sudo systemctl start mongodb
```

### Step 3: Setup Backend (Node.js)

```bash
# Navigate to Backend folder
cd Backend

# Install dependencies
npm install

# Create .env file
copy .env.example .env  # Windows
# OR
cp .env.example .env    # Mac/Linux

# Edit .env file with your values
notepad .env  # Windows
# OR
nano .env     # Mac/Linux
```

**Backend .env Configuration:**
```env
# Server
PORT=8000

# Database (Use MongoDB Atlas connection string)
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/finchatbot

# CORS (Frontend URL)
CORS_ORIGIN=http://localhost:5173

# JWT Secrets (Generate strong random strings)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
ACCESS_TOKEN_SECRET=your-access-token-secret-change-this
ACCESS_TOKEN_EXPIRY=1d
REFRESH_TOKEN_SECRET=your-refresh-token-secret-change-this
REFRESH_TOKEN_EXPIRY=10d

# Email (Gmail App Password)
EMAIL_ID_FOR_VERIFICATION=your-email@gmail.com
EMAIL_PASSWORD_FOR_VERIFICATION=your-16-char-app-password

# Python Service URL
PYTHON_SERVICE_URL=http://localhost:5000
```

**How to get Gmail App Password:**
1. Go to Google Account Settings
2. Security → 2-Step Verification (enable it)
3. Security → App passwords
4. Generate new app password
5. Copy the 16-character password

```bash
# Start Backend
npm run dev

# Backend should now be running on http://localhost:8000
```

### Step 4: Setup Python AI Service

```bash
# Open new terminal
cd Python-Backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
copy .env.example .env  # Windows
# OR
cp .env.example .env    # Mac/Linux

# Edit .env file
notepad .env  # Windows
# OR
nano .env     # Mac/Linux
```

**Python .env Configuration:**
```env
# Groq API Key (Primary - Fast)
GROQ_API_KEY=gsk_your_groq_api_key_here

# Google Gemini API Key (Fallback - Accurate)
GOOGLE_API_KEY=AIza_your_google_api_key_here

# Node.js Backend URL
NODE_WEBHOOK_URL=http://localhost:8000

# Server Port
PORT=5000
```

**How to get API Keys:**

**Groq API Key:**
1. Visit [Groq Console](https://console.groq.com/keys)
2. Sign up with Google or email
3. Click "Create API Key"
4. Copy the key (starts with `gsk_`)

**Google Gemini API Key:**
1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with Google account
3. Click "Create API Key"
4. Copy the key (starts with `AIza`)

```bash
# Start Python Service
python app/main.py

# Python service should now be running on http://localhost:5000
```

### Step 5: Setup Frontend (React)

```bash
# Open new terminal
cd Frontend

# Install dependencies
npm install

# Create .env file
copy .env.example .env  # Windows
# OR
cp .env.example .env    # Mac/Linux

# Edit .env file
notepad .env  # Windows
# OR
nano .env     # Mac/Linux
```

**Frontend .env Configuration:**
```env
VITE_API_URL=http://localhost:8000/api/v1
```

```bash
# Start Frontend
npm run dev

# Frontend should now be running on http://localhost:5173
```

### Step 6: Test Local Deployment

1. Open browser: `http://localhost:5173`
2. Register a new account
3. Check email for verification link
4. Login after verification
5. Upload a test document
6. Ask questions about the document

**All three services should be running:**
- ✅ Frontend: http://localhost:5173
- ✅ Backend: http://localhost:8000
- ✅ Python AI: http://localhost:5000

---

## 2️⃣ CLOUD DEPLOYMENT (Production - Recommended)

### Architecture Overview

```
Frontend (Vercel/Netlify)
    ↓
Backend (Render/Railway/Heroku)
    ↓
Python AI (Render/Railway)
    ↓
MongoDB Atlas (Cloud Database)
```

---

### A. Deploy MongoDB (Database)

**Already done if using MongoDB Atlas from Step 2!**

If not:
1. Create MongoDB Atlas account
2. Create cluster (Free M0)
3. Create database user
4. Whitelist IP: `0.0.0.0/0` (allow from anywhere)
5. Get connection string

---

### B. Deploy Python AI Service

#### Option 1: Render (Recommended - Free Tier)

1. **Create Render Account**
   - Go to [Render.com](https://render.com/)
   - Sign up with GitHub

2. **Create New Web Service**
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Select `Python-Backend` folder

3. **Configure Service**
   ```
   Name: finchatbot-ai
   Region: Choose closest to you
   Branch: main
   Root Directory: Python-Backend
   Runtime: Python 3
   Build Command: pip install -r requirements.txt
   Start Command: uvicorn app.main:app --host 0.0.0.0 --port $PORT
   ```

4. **Add Environment Variables**
   ```
   GROQ_API_KEY=your_groq_key
   GOOGLE_API_KEY=your_gemini_key
   NODE_WEBHOOK_URL=https://your-backend-url.onrender.com
   PORT=5000
   ```

5. **Deploy**
   - Click "Create Web Service"
   - Wait for deployment (5-10 minutes)
   - Copy the service URL (e.g., `https://finchatbot-ai.onrender.com`)

#### Option 2: Railway

1. Go to [Railway.app](https://railway.app/)
2. Sign up with GitHub
3. "New Project" → "Deploy from GitHub repo"
4. Select repository → Select `Python-Backend` folder
5. Add environment variables (same as above)
6. Deploy automatically

---

### C. Deploy Backend (Node.js)

#### Option 1: Render (Recommended)

1. **Create New Web Service**
   - Click "New +" → "Web Service"
   - Connect GitHub repository
   - Select `Backend` folder

2. **Configure Service**
   ```
   Name: finchatbot-backend
   Region: Choose closest to you
   Branch: main
   Root Directory: Backend
   Runtime: Node
   Build Command: npm install
   Start Command: npm start
   ```

3. **Add Environment Variables**
   ```
   PORT=8000
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/finchatbot
   CORS_ORIGIN=https://your-frontend-url.vercel.app
   JWT_SECRET=generate-strong-random-string-here
   ACCESS_TOKEN_SECRET=generate-strong-random-string-here
   ACCESS_TOKEN_EXPIRY=1d
   REFRESH_TOKEN_SECRET=generate-strong-random-string-here
   REFRESH_TOKEN_EXPIRY=10d
   EMAIL_ID_FOR_VERIFICATION=your-email@gmail.com
   EMAIL_PASSWORD_FOR_VERIFICATION=your-app-password
   PYTHON_SERVICE_URL=https://finchatbot-ai.onrender.com
   ```

4. **Deploy**
   - Click "Create Web Service"
   - Wait for deployment
   - Copy the service URL (e.g., `https://finchatbot-backend.onrender.com`)

#### Option 2: Heroku

```bash
# Install Heroku CLI
# Download from: https://devcenter.heroku.com/articles/heroku-cli

# Login to Heroku
heroku login

# Navigate to Backend folder
cd Backend

# Create Heroku app
heroku create finchatbot-backend

# Add environment variables
heroku config:set MONGODB_URI="your-mongodb-uri"
heroku config:set JWT_SECRET="your-secret"
# ... add all other variables

# Deploy
git subtree push --prefix Backend heroku main

# Or if using separate repo:
git push heroku main
```

---

### D. Deploy Frontend

#### Option 1: Vercel (Recommended - Best for React)

1. **Install Vercel CLI (Optional)**
   ```bash
   npm install -g vercel
   ```

2. **Deploy via Vercel Dashboard**
   - Go to [Vercel.com](https://vercel.com/)
   - Sign up with GitHub
   - Click "Add New" → "Project"
   - Import your GitHub repository
   - Configure:
     ```
     Framework Preset: Vite
     Root Directory: Frontend
     Build Command: npm run build
     Output Directory: dist
     Install Command: npm install
     ```

3. **Add Environment Variables**
   - Go to Project Settings → Environment Variables
   - Add:
     ```
     VITE_API_URL=https://finchatbot-backend.onrender.com/api/v1
     ```

4. **Deploy**
   - Click "Deploy"
   - Wait for deployment (2-3 minutes)
   - Get your URL (e.g., `https://finchatbot.vercel.app`)

5. **Update Backend CORS**
   - Go back to Render (Backend service)
   - Update `CORS_ORIGIN` environment variable:
     ```
     CORS_ORIGIN=https://finchatbot.vercel.app
     ```
   - Redeploy backend

#### Option 2: Netlify

1. **Deploy via Netlify Dashboard**
   - Go to [Netlify.com](https://www.netlify.com/)
   - Sign up with GitHub
   - "Add new site" → "Import an existing project"
   - Connect GitHub repository
   - Configure:
     ```
     Base directory: Frontend
     Build command: npm run build
     Publish directory: Frontend/dist
     ```

2. **Add Environment Variables**
   - Site settings → Environment variables
   - Add:
     ```
     VITE_API_URL=https://finchatbot-backend.onrender.com/api/v1
     ```

3. **Deploy**
   - Click "Deploy site"
   - Get your URL

---

## 3️⃣ VPS DEPLOYMENT (Self-Hosted)

### Prerequisites
- VPS (DigitalOcean, AWS EC2, Linode, etc.)
- Ubuntu 20.04+ or similar
- Domain name (optional but recommended)

### Step 1: Setup VPS

```bash
# SSH into your VPS
ssh root@your-server-ip

# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install Python
sudo apt install -y python3 python3-pip python3-venv

# Install MongoDB (optional - use Atlas instead)
# Follow: https://docs.mongodb.com/manual/tutorial/install-mongodb-on-ubuntu/

# Install Nginx
sudo apt install -y nginx

# Install PM2 (Process Manager)
sudo npm install -g pm2

# Install Git
sudo apt install -y git
```

### Step 2: Clone Repository

```bash
# Create app directory
mkdir -p /var/www
cd /var/www

# Clone repository
git clone <your-repo-url> finchatbot
cd finchatbot
```

### Step 3: Setup Backend

```bash
cd Backend

# Install dependencies
npm install

# Create .env file
nano .env
# Add all environment variables (same as local)

# Start with PM2
pm2 start src/server.js --name finchatbot-backend
pm2 save
pm2 startup
```

### Step 4: Setup Python Service

```bash
cd ../Python-Backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
nano .env
# Add all environment variables

# Create PM2 ecosystem file
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'finchatbot-ai',
    script: 'venv/bin/python',
    args: 'app/main.py',
    cwd: '/var/www/finchatbot/Python-Backend',
    interpreter: 'none'
  }]
}
EOF

# Start with PM2
pm2 start ecosystem.config.js
pm2 save
```

### Step 5: Setup Frontend

```bash
cd ../Frontend

# Install dependencies
npm install

# Create .env file
nano .env
# Add: VITE_API_URL=https://your-domain.com/api/v1

# Build for production
npm run build

# Copy build to nginx directory
sudo cp -r dist /var/www/finchatbot-frontend
```

### Step 6: Configure Nginx

```bash
# Create Nginx configuration
sudo nano /etc/nginx/sites-available/finchatbot

# Add this configuration:
```

```nginx
# Frontend
server {
    listen 80;
    server_name your-domain.com;

    root /var/www/finchatbot-frontend;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Python AI Service
    location /ai/ {
        proxy_pass http://localhost:5000/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/finchatbot /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

### Step 7: Setup SSL (HTTPS)

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal is configured automatically
```

### Step 8: Setup Firewall

```bash
# Allow necessary ports
sudo ufw allow 22    # SSH
sudo ufw allow 80    # HTTP
sudo ufw allow 443   # HTTPS
sudo ufw enable
```

---

## 🔒 Security Checklist

### Before Going Live

- [ ] Change all default secrets in .env files
- [ ] Use strong JWT secrets (32+ characters)
- [ ] Enable HTTPS/SSL
- [ ] Configure CORS properly (specific origins only)
- [ ] Set up MongoDB authentication
- [ ] Whitelist specific IPs in MongoDB Atlas
- [ ] Enable rate limiting
- [ ] Set up monitoring and logging
- [ ] Configure backup strategy
- [ ] Test all features in production
- [ ] Set up error tracking (Sentry)

---

## 📊 Post-Deployment Testing

### Test Checklist

1. **Frontend**
   - [ ] Website loads correctly
   - [ ] Logo displays
   - [ ] Responsive on mobile
   - [ ] All pages accessible

2. **Authentication**
   - [ ] Registration works
   - [ ] Email verification received
   - [ ] Login works
   - [ ] Logout works

3. **Chat Features**
   - [ ] Create new conversation
   - [ ] Upload documents (PDF, Excel)
   - [ ] Ask questions
   - [ ] Receive AI responses
   - [ ] Delete conversations

4. **Performance**
   - [ ] Fast page loads
   - [ ] Quick AI responses
   - [ ] No errors in console
   - [ ] Mobile performance good

---

## 🔧 Troubleshooting

### Common Issues

**Issue: Frontend can't connect to Backend**
```
Solution:
1. Check VITE_API_URL in frontend .env
2. Check CORS_ORIGIN in backend .env
3. Verify backend is running
4. Check network/firewall settings
```

**Issue: Email verification not working**
```
Solution:
1. Verify Gmail App Password is correct
2. Check EMAIL_ID_FOR_VERIFICATION
3. Check spam folder
4. Ensure 2FA is enabled on Gmail
```

**Issue: Document processing fails**
```
Solution:
1. Check Python service is running
2. Verify API keys (Groq, Gemini)
3. Check PYTHON_SERVICE_URL in backend
4. Check Python service logs
```

**Issue: MongoDB connection fails**
```
Solution:
1. Verify connection string
2. Check network access in MongoDB Atlas
3. Whitelist IP addresses
4. Check database user credentials
```

---

## 📈 Monitoring & Maintenance

### Recommended Tools

1. **Uptime Monitoring**
   - [UptimeRobot](https://uptimerobot.com/) (Free)
   - [Pingdom](https://www.pingdom.com/)

2. **Error Tracking**
   - [Sentry](https://sentry.io/) (Free tier)

3. **Analytics**
   - [Google Analytics](https://analytics.google.com/)
   - [Plausible](https://plausible.io/)

4. **Logging**
   - PM2 logs: `pm2 logs`
   - Render logs: Available in dashboard
   - Vercel logs: Available in dashboard

---

## 💰 Cost Estimate

### Free Tier (Recommended for Starting)

| Service | Cost | Limits |
|---------|------|--------|
| MongoDB Atlas | Free | 512MB storage |
| Render (Backend) | Free | 750 hours/month |
| Render (Python) | Free | 750 hours/month |
| Vercel (Frontend) | Free | 100GB bandwidth |
| Groq API | Free | Generous limits |
| Gemini API | Free | Good limits |
| **Total** | **$0/month** | Good for testing |

### Paid Tier (Production)

| Service | Cost | Benefits |
|---------|------|----------|
| MongoDB Atlas | $9/month | 2GB storage |
| Render | $7/month each | Always on, better performance |
| Vercel Pro | $20/month | More bandwidth |
| **Total** | **~$43/month** | Production ready |

---

## 🎯 Quick Deployment Summary

### Fastest Way to Deploy (15 minutes)

1. **MongoDB Atlas** (5 min)
   - Create account → Create cluster → Get connection string

2. **Get API Keys** (5 min)
   - Groq: console.groq.com/keys
   - Gemini: makersuite.google.com/app/apikey

3. **Deploy Python AI** (2 min)
   - Render.com → New Web Service → Connect repo → Add env vars

4. **Deploy Backend** (2 min)
   - Render.com → New Web Service → Connect repo → Add env vars

5. **Deploy Frontend** (1 min)
   - Vercel.com → Import project → Add env vars → Deploy

**Done! Your app is live! 🎉**

---

## 📞 Support

If you encounter issues:
1. Check the logs (PM2, Render, Vercel dashboards)
2. Verify all environment variables
3. Test each service individually
4. Check API key validity
5. Review error messages carefully

---

**Good luck with your deployment! 🚀**
