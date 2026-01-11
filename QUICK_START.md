# FinChatBot - Quick Start Guide

## ⚡ 5-Minute Local Setup

### Prerequisites
- Node.js 18+ installed
- Python 3.9+ installed
- Git installed

### Step 1: Get API Keys (2 minutes)

1. **Groq API Key** (Free)
   - Visit: https://console.groq.com/keys
   - Sign up → Create API Key
   - Copy key (starts with `gsk_`)

2. **Google Gemini API Key** (Free)
   - Visit: https://makersuite.google.com/app/apikey
   - Sign in → Create API Key
   - Copy key (starts with `AIza`)

3. **MongoDB Atlas** (Free)
   - Visit: https://www.mongodb.com/cloud/atlas
   - Create account → Create cluster (M0 Free)
   - Get connection string

4. **Gmail App Password**
   - Google Account → Security → 2-Step Verification (enable)
   - App passwords → Generate
   - Copy 16-character password

---

### Step 2: Setup Backend (1 minute)

```bash
cd Backend
npm install
copy .env.example .env  # Windows
# OR
cp .env.example .env    # Mac/Linux
```

Edit `.env`:
```env
PORT=8000
MONGODB_URI=your-mongodb-connection-string
CORS_ORIGIN=http://localhost:5173
JWT_SECRET=change-this-to-random-string
ACCESS_TOKEN_SECRET=change-this-to-random-string
ACCESS_TOKEN_EXPIRY=1d
REFRESH_TOKEN_SECRET=change-this-to-random-string
REFRESH_TOKEN_EXPIRY=10d
EMAIL_ID_FOR_VERIFICATION=your-email@gmail.com
EMAIL_PASSWORD_FOR_VERIFICATION=your-16-char-app-password
PYTHON_SERVICE_URL=http://localhost:5000
```

Start:
```bash
npm run dev
```

---

### Step 3: Setup Python AI (1 minute)

```bash
cd Python-Backend
python -m venv venv

# Activate virtual environment
venv\Scripts\activate  # Windows
source venv/bin/activate  # Mac/Linux

pip install -r requirements.txt
copy .env.example .env  # Windows
cp .env.example .env    # Mac/Linux
```

Edit `.env`:
```env
GROQ_API_KEY=your-groq-api-key
GOOGLE_API_KEY=your-gemini-api-key
NODE_WEBHOOK_URL=http://localhost:8000
PORT=5000
```

Start:
```bash
python app/main.py
```

---

### Step 4: Setup Frontend (1 minute)

```bash
cd Frontend
npm install
copy .env.example .env  # Windows
cp .env.example .env    # Mac/Linux
```

Edit `.env`:
```env
VITE_API_URL=http://localhost:8000/api/v1
```

Start:
```bash
npm run dev
```

---

## ✅ Test Your Setup

1. Open browser: http://localhost:5173
2. Register new account
3. Check email for verification
4. Login
5. Upload a PDF document
6. Ask: "What is this document about?"

---

## 🚀 Quick Cloud Deployment (15 minutes)

### Option 1: All-in-One (Render + Vercel)

**1. Deploy Python AI (Render)**
- Go to: https://render.com
- New Web Service → Connect GitHub
- Root Directory: `Python-Backend`
- Build: `pip install -r requirements.txt`
- Start: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- Add environment variables (Groq, Gemini keys)
- Deploy → Copy URL

**2. Deploy Backend (Render)**
- New Web Service → Connect GitHub
- Root Directory: `Backend`
- Build: `npm install`
- Start: `npm start`
- Add environment variables (MongoDB, JWT secrets, Python URL)
- Deploy → Copy URL

**3. Deploy Frontend (Vercel)**
- Go to: https://vercel.com
- Import Project → Connect GitHub
- Root Directory: `Frontend`
- Framework: Vite
- Add env: `VITE_API_URL=your-backend-url/api/v1`
- Deploy → Done!

**4. Update CORS**
- Go back to Render (Backend)
- Update `CORS_ORIGIN` to your Vercel URL
- Redeploy

---

## 📱 Access Your App

**Local:**
- Frontend: http://localhost:5173
- Backend: http://localhost:8000
- Python AI: http://localhost:5000
- API Docs: http://localhost:5000/docs

**Production:**
- Your Vercel URL (e.g., https://finchatbot.vercel.app)

---

## 🐛 Common Issues

**Backend won't start:**
```bash
# Check MongoDB connection
# Verify .env file exists
# Check port 8000 is not in use
```

**Python service fails:**
```bash
# Verify virtual environment is activated
# Check API keys are valid
# Ensure all dependencies installed
```

**Frontend can't connect:**
```bash
# Check VITE_API_URL in .env
# Verify backend is running
# Check CORS_ORIGIN in backend
```

---

## 📚 Full Documentation

- **Complete Setup**: See `DEPLOYMENT_GUIDE.md`
- **Architecture**: See `README.md`
- **Process Flow**: See `PROCESS_PIPELINE.md`
- **Responsive Design**: See `RESPONSIVE_TEST_GUIDE.md`

---

## 🎯 What You Get

✅ Professional AI-powered financial chatbot
✅ Document analysis (PDF, Excel, CSV)
✅ OCR text extraction
✅ Multi-modal AI (Groq + Gemini)
✅ Real-time chat with Socket.IO
✅ User authentication with email verification
✅ Fully responsive design (mobile, tablet, desktop)
✅ Professional logo and branding
✅ Vector search with FAISS
✅ RAG (Retrieval Augmented Generation)

---

## 💡 Tips

1. **Use MongoDB Atlas** (free tier) instead of local MongoDB
2. **Keep API keys secret** - never commit .env files
3. **Test locally first** before deploying to cloud
4. **Use strong JWT secrets** in production
5. **Enable HTTPS** in production (automatic with Vercel/Render)

---

## 🆘 Need Help?

1. Check logs:
   - Backend: Terminal output
   - Python: Terminal output
   - Frontend: Browser console (F12)

2. Verify environment variables are set correctly

3. Ensure all services are running

4. Check API keys are valid

---

**Ready to start? Follow Step 1 above! 🚀**
