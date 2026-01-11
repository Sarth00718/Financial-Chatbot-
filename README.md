# FinChatBot - AI-Powered Financial Document Analysis Platform

A modern, full-stack financial chatbot application that uses AI to analyze financial documents and provide intelligent insights. Built with React, Node.js, Python, and powered by Groq and Google Gemini AI.

## 🎯 Overview

FinChatBot is a comprehensive financial document analysis platform that allows users to:
- Upload financial documents (PDFs, Excel, CSV)
- Ask questions about their documents using natural language
- Get AI-powered insights and analysis
- View analytics and conversation history
- Manage multiple conversations with document context

## 🏗️ Architecture

The application consists of three main components:

```
┌─────────────────────────────────────────────────────────────┐
│                         Frontend                             │
│              React + Vite + Tailwind CSS                     │
│                   (Port: 5173)                               │
└──────────────────────┬──────────────────────────────────────┘
                       │ HTTP/WebSocket
┌──────────────────────▼──────────────────────────────────────┐
│                    Node.js Backend                           │
│         Express + MongoDB + Socket.IO                        │
│                   (Port: 8000)                               │
│  • User Authentication (JWT)                                 │
│  • Conversation Management                                   │
│  • Document Upload & Storage                                 │
│  • Real-time Chat (Socket.IO)                                │
└──────────────────────┬──────────────────────────────────────┘
                       │ HTTP API
┌──────────────────────▼──────────────────────────────────────┐
│                   Python AI Backend                          │
│        FastAPI + LangChain + FAISS                           │
│                   (Port: 5000)                               │
│  • Document Processing (PDF/Excel)                           │
│  • Vector Embeddings (HuggingFace)                           │
│  • RAG Pipeline (Retrieval Augmented Generation)             │
│  • AI Models (Groq + Gemini)                                 │
└─────────────────────────────────────────────────────────────┘
```

## ✨ Key Features

### User Features
- **Secure Authentication**: JWT-based auth with email verification
- **Document Upload**: Support for PDF, Excel, and CSV files
- **Multi-Modal AI**: Analyzes both text and images in documents
- **Real-Time Chat**: Instant responses with Socket.IO
- **Conversation Management**: Create, view, and delete conversations
- **Analytics Dashboard**: Track usage and insights
- **Responsive Design**: Works on desktop, tablet, and mobile

### Technical Features
- **Local-First**: All documents stored locally (no cloud dependencies)
- **Dual AI Strategy**: Groq (speed) + Gemini (accuracy)
- **RAG Pipeline**: Retrieval Augmented Generation for accurate answers
- **Vector Search**: FAISS-based local vector database
- **Smart Fallback**: Automatic model switching for optimal results
- **Real-Time Updates**: WebSocket communication for instant feedback

## 🚀 Quick Start

### Prerequisites

- **Node.js**: v18 or higher
- **Python**: 3.9 or higher
- **MongoDB**: v6 or higher
- **Groq API Key**: [Get here](https://console.groq.com/keys)
- **Google Gemini API Key**: [Get here](https://makersuite.google.com/app/apikey)

### Installation

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd finchatbot
   ```

2. **Set up Backend (Node.js)**:
   ```bash
   cd Backend
   npm install
   cp .env.example .env
   # Edit .env with your configuration
   npm run dev
   ```

3. **Set up Python AI Service**:
   ```bash
   cd Python-Backend
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   cp .env.example .env
   # Edit .env with your API keys
   python app/main.py
   ```

4. **Set up Frontend**:
   ```bash
   cd Frontend
   npm install
   cp .env.example .env
   # Edit .env with backend URL
   npm run dev
   ```

5. **Access the application**:
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:8000
   - Python AI Service: http://localhost:5000
   - API Documentation: http://localhost:5000/docs

## 📁 Project Structure

```
finchatbot/
├── Backend/                    # Node.js Express Backend
│   ├── src/
│   │   ├── config/            # Configuration files
│   │   ├── controllers/       # Request handlers
│   │   ├── middlewares/       # Express middlewares
│   │   ├── models/            # MongoDB schemas
│   │   ├── routes/            # API routes
│   │   ├── utils/             # Utility functions
│   │   ├── app.js             # Express app setup
│   │   └── server.js          # Server entry point
│   ├── uploads/               # Document storage
│   ├── package.json
│   └── README.md
│
├── Frontend/                   # React Frontend
│   ├── src/
│   │   ├── components/        # React components
│   │   ├── context/           # Context providers
│   │   ├── pages/             # Page components
│   │   ├── utils/             # Utility functions
│   │   └── main.jsx           # App entry point
│   ├── package.json
│   └── README.md
│
├── Python-Backend/             # Python AI Service
│   ├── app/
│   │   ├── api/               # API routes
│   │   ├── config/            # Configuration & prompts
│   │   ├── models/            # Pydantic schemas
│   │   ├── services/          # Business logic
│   │   └── main.py            # FastAPI app
│   ├── vector_store/          # Local FAISS database
│   ├── requirements.txt
│   └── README.md
│
└── README.md                   # This file
```

## 🔧 Configuration

### Backend (.env)
```env
PORT=8000
MONGODB_URI=mongodb://localhost:27017
CORS_ORIGIN=http://localhost:5173
JWT_SECRET=your-secret-key
ACCESS_TOKEN_SECRET=your-access-token-secret
ACCESS_TOKEN_EXPIRY=1d
REFRESH_TOKEN_SECRET=your-refresh-token-secret
REFRESH_TOKEN_EXPIRY=10d
EMAIL_ID_FOR_VERIFICATION=your-email@gmail.com
EMAIL_PASSWORD_FOR_VERIFICATION=your-app-password
PYTHON_SERVICE_URL=http://localhost:5000
```

### Python Backend (.env)
```env
GROQ_API_KEY=your-groq-api-key
GOOGLE_API_KEY=your-google-api-key
NODE_WEBHOOK_URL=http://localhost:8000
PORT=5000
```

### Frontend (.env)
```env
VITE_API_URL=http://localhost:8000/api/v1
```

## 🤖 AI Models & Strategy

### Primary: Groq
- **LLM**: llama-3.3-70b-versatile (fast reasoning)
- **Vision**: llama-3.2-90b-vision-preview (image analysis)
- **Advantages**: Very fast, cost-effective, good for most queries

### Fallback: Google Gemini
- **LLM**: gemini-2.0-flash-exp (complex reasoning)
- **Vision**: gemini-2.0-flash-exp (complex images)
- **Advantages**: Highly accurate, handles complex scenarios

### Embeddings
- **Model**: sentence-transformers/all-MiniLM-L6-v2
- **Storage**: FAISS (local vector database)
- **Advantages**: Fast, runs on CPU, no cloud dependencies

## 📡 API Endpoints

### Authentication
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - Login user
- `POST /api/v1/auth/logout` - Logout user
- `GET /api/v1/auth/me` - Get current user
- `GET /api/v1/auth/verify-email` - Verify email

### Conversations
- `GET /api/v1/conversations` - Get all conversations
- `POST /api/v1/conversations` - Create conversation
- `GET /api/v1/conversations/:id` - Get conversation details
- `PATCH /api/v1/conversations/:id` - Update conversation
- `DELETE /api/v1/conversations/:id` - Delete conversation

### Documents
- `POST /api/v1/documents/upload` - Upload documents
- `GET /api/v1/documents/conversation/:id` - Get documents
- `DELETE /api/v1/documents/:id` - Delete document

### AI Service
- `POST /process-document` - Process uploaded document
- `POST /query` - Ask question with context
- `POST /delete-document` - Delete document vectors

## 🎓 How It Works

### Document Processing Flow
1. User uploads PDF/Excel file via frontend
2. Node.js backend saves file locally
3. Backend sends file path to Python service
4. Python service:
   - Extracts text from document
   - Analyzes images using AI vision
   - Creates text chunks
   - Generates embeddings
   - Stores in FAISS vector database
5. Backend notified of completion
6. User can now ask questions

### Query Flow
1. User asks a question
2. Frontend sends to Node.js backend
3. Backend forwards to Python service
4. Python service:
   - Searches vector database for relevant chunks
   - Retrieves top matching documents
   - Builds context with retrieved information
   - Sends to AI model (Groq → Gemini fallback)
   - Returns AI-generated answer
5. Answer displayed to user in real-time

## 🛠️ Development

### Running Tests
```bash
# Backend tests
cd Backend
npm test

# Frontend tests
cd Frontend
npm test

# Python tests
cd Python-Backend
pytest
```

### Building for Production
```bash
# Frontend
cd Frontend
npm run build

# Backend (no build needed, runs directly)
cd Backend
npm start

# Python (no build needed, runs directly)
cd Python-Backend
python app/main.py
```

## 🔐 Security

- **JWT Authentication**: Secure token-based auth
- **Password Hashing**: bcrypt for password security
- **CORS Protection**: Restricted origins
- **Input Validation**: Pydantic and Express validators
- **File Upload Limits**: 50MB max file size
- **Local Storage**: No cloud dependencies
- **Environment Variables**: Sensitive data in .env files

## 📊 Tech Stack

### Frontend
- React 18
- Vite
- Tailwind CSS
- React Router
- Axios
- Socket.IO Client
- Lucide Icons

### Backend (Node.js)
- Express
- MongoDB + Mongoose
- Socket.IO
- JWT
- Multer
- Nodemailer

### Backend (Python)
- FastAPI
- LangChain
- FAISS
- HuggingFace Transformers
- PyMuPDF
- Pandas

### AI/ML
- Groq API
- Google Gemini API
- Sentence Transformers
- FAISS Vector Database

## 🐛 Troubleshooting

### MongoDB Connection Failed
- Ensure MongoDB is running: `mongod`
- Check connection string in Backend/.env

### Python Service Not Starting
- Activate virtual environment
- Install dependencies: `pip install -r requirements.txt`
- Check API keys in Python-Backend/.env

### Frontend Can't Connect
- Verify Backend is running on port 8000
- Check VITE_API_URL in Frontend/.env
- Check CORS settings in Backend

### File Upload Fails
- Check uploads/ directory exists
- Verify file size < 50MB
- Check disk space

## 📝 License

ISC

## 👥 Authors

FinChatBot Team

## 🙏 Acknowledgments

- Groq for fast AI inference
- Google for Gemini AI
- LangChain for RAG framework
- HuggingFace for embeddings
- MongoDB for database
- FastAPI for Python backend
- React team for frontend framework

---

**Need Help?** 
- Check individual README files in each directory
- Review API documentation at http://localhost:5000/docs
- Check logs for error messages
- Ensure all services are running

**Happy Chatting! 🚀**
