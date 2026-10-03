# Setup Guide

Complete setup instructions for Financial ChatBot.

## System Requirements

- **Node.js**: 18.0.0 or higher
- **Python**: 3.9 or higher
- **MongoDB**: 4.4 or higher (local or MongoDB Atlas)
- **RAM**: Minimum 4GB recommended
- **Storage**: 2GB free space

## Step-by-Step Setup

### 1. MongoDB Setup

#### Option A: MongoDB Atlas (Cloud - Recommended)
1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free account
3. Create a new cluster (M0 Free tier)
4. Create a database user
5. Whitelist your IP address
6. Get your connection string

#### Option B: Local MongoDB
1. Download MongoDB from [mongodb.com](https://www.mongodb.com/try/download/community)
2. Install and start MongoDB service
3. Connection string: `mongodb://localhost:27017/finchatbot`

### 2. Get API Keys

#### Groq API Key (Required)
1. Visit [console.groq.com](https://console.groq.com)
2. Sign up for free account
3. Navigate to API Keys section
4. Create new API key
5. Copy the key (starts with `gsk_`)

#### OCR.Space API Key (Optional for OCR)
1. Visit [ocr.space/ocrapi](https://ocr.space/ocrapi)
2. Sign up for free account
3. Get your API key from dashboard
4. Free tier: 25,000 requests/month

### 3. Backend Configuration

```bash
cd Backend
npm install
cp .env.example .env
```

Edit `Backend/.env`:
```env
PORT=8000
NODE_ENV=development

# MongoDB - Use your connection string
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/finchatbot

# CORS - Frontend URL
CORS_ORIGIN=http://localhost:5173

# Python Service
PYTHON_SERVICE_URL=http://localhost:5000

# JWT Secrets - Generate your own!
# Run: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
JWT_ACCESS_SECRET=your_32_character_secret_here
JWT_REFRESH_SECRET=your_32_character_secret_here

# Optional: Email Service (for notifications)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
```

### 4. Python Backend Configuration

```bash
cd Python-Backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Copy environment file
cp .env.example .env
```

Edit `Python-Backend/.env`:
```env
# Groq API Key (Required)
GROQ_API_KEY=gsk_your_groq_api_key_here

# Node.js Backend
NODE_WEBHOOK_URL=http://localhost:8000

# Server
PORT=5000

# LLM Configuration
LLM_MODEL=openai/gpt-oss-20b

# OCR Configuration (Optional)
OCR_PROVIDER=ocr_space
OCR_SPACE_API_KEY=your_ocr_api_key_here
```

### 5. Frontend Configuration

```bash
cd Frontend
npm install
cp .env.example .env
```

Edit `Frontend/.env`:
```env
VITE_API_URL=/api/v1
VITE_BACKEND_ORIGIN=http://localhost:8000
```

### 6. Create Admin User

To create an admin user, register through the application and manually update the user's role in MongoDB:

1. Register a new user through the frontend
2. Connect to MongoDB (Atlas or local)
3. Find the user in the `users` collection
4. Update the role field:
```javascript
db.users.updateOne(
  { email: "your-admin@email.com" },
  { $set: { role: "admin" } }
)
```

## Running the Application

### Method 1: Using Startup Script (Windows)

```bash
# From project root
start-services.bat
```

### Method 2: Manual Start

Open 3 separate terminal windows:

**Terminal 1 - Python AI Service:**
```bash
cd Python-Backend
venv\Scripts\activate  # Windows
# source venv/bin/activate  # macOS/Linux
python -m uvicorn app.main:app --host 0.0.0.0 --port 5000 --reload
```

**Terminal 2 - Node.js Backend:**
```bash
cd Backend
npm run dev
```

**Terminal 3 - React Frontend:**
```bash
cd Frontend
npm run dev
```

### Access the Application

Open your browser and navigate to:
```
http://localhost:5173
```

## Verification Checklist

- [ ] MongoDB is connected (check Backend logs)
- [ ] Python service shows "Service ready to accept requests"
- [ ] Backend shows "FinChatBot Backend Server Started"
- [ ] Frontend opens in browser
- [ ] Can register a new user
- [ ] Can login successfully
- [ ] Can create a new conversation
- [ ] Can upload a document
- [ ] Can send messages and get AI responses

## Troubleshooting

### MongoDB Connection Failed
- Check MongoDB service is running
- Verify connection string format
- Check network/firewall settings
- Whitelist IP in MongoDB Atlas

### Python Service Won't Start
- Check Python version: `python --version`
- Verify virtual environment is activated
- Reinstall dependencies: `pip install -r requirements.txt --force-reinstall`
- Check port 5000 is not in use

### Backend Port Already in Use
- Kill process on port 8000:
  ```bash
  # Windows
  netstat -ano | findstr :8000
  taskkill /PID <process_id> /F
  ```

### Frontend Build Errors
- Clear node_modules: `rm -rf node_modules && npm install`
- Clear cache: `npm cache clean --force`
- Check Node.js version: `node --version`

### AI Responses Not Working
- Verify Groq API key is correct
- Check Python service logs for errors
- Ensure Python service URL is correct in Backend .env
- Test API key at console.groq.com

## Production Deployment

For production deployment, use the docker-compose.yml file or deploy each service separately to your preferred hosting platform (Vercel, Railway, etc.).

## Additional Resources

- [MongoDB Documentation](https://docs.mongodb.com/)
- [Groq API Docs](https://console.groq.com/docs)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [React Documentation](https://react.dev/)

## Support

For issues or questions, please open an issue on GitHub.
