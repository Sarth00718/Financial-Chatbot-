# Financial ChatBot

**AI-Powered Financial Document Analysis Using RAG Technology**

> A sophisticated full-stack application that enables natural language interaction with financial documents through Retrieval-Augmented Generation (RAG).

## 🎓 Academic Final Year Project

This project demonstrates the practical implementation of modern AI technologies including:
- **RAG (Retrieval-Augmented Generation)** - Advanced AI framework for document Q&A
- **Vector Databases** - FAISS for semantic search
- **Large Language Models** - Groq AI integration
- **Full-Stack Development** - React + Node.js + Python microservices
- **Real-time Communication** - WebSocket integration

📚 **[Complete Academic Documentation](./docs/ACADEMIC_PROJECT.md)**

## Overview

This application allows users to upload financial documents (PDF, Excel, CSV) and interact with them using natural language queries. It uses RAG (Retrieval-Augmented Generation) technology to provide accurate, context-aware responses based on your uploaded documents.

### Key Innovation: RAG Pipeline

```
📄 Document → 🔪 Chunking → 🧬 Embeddings → 💾 FAISS Vector Store
                                                        ↓
👤 User Query → 🔍 Similarity Search → 📊 Top-K Chunks → 🤖 LLM → ✅ Answer
```

The RAG system ensures:
- ✅ **Accurate** - Answers are grounded in actual document content
- ✅ **Traceable** - Every response includes source citations with page numbers
- ✅ **Contextual** - Understands natural language and context
- ✅ **Efficient** - Fast retrieval using vector similarity search

## Tech Stack

### Frontend
- React 18
- Vite
- TailwindCSS
- Socket.IO Client
- Recharts (for data visualization)

### Backend (Node.js)
- Express.js
- MongoDB (with Mongoose)
- Socket.IO
- JWT Authentication
- Multer (file uploads)

### AI Service (Python)
- FastAPI
- LangChain
- Groq AI (LLM)
- FAISS (vector store)
- PyMuPDF (PDF processing)
- OCR.Space API (OCR)

## Features

- **Document Upload**: Support for PDF, Excel, and CSV files
- **Intelligent Chat**: Natural language queries about your documents
- **Real-time Updates**: WebSocket-based live chat
- **User Authentication**: Secure JWT-based authentication
- **Admin Dashboard**: User and system management
- **Data Visualization**: Auto-generate charts from financial data
- **OCR Support**: Extract text from scanned documents
- **Vector Search**: Semantic search using embeddings

## Prerequisites

- Node.js 18+ and npm
- Python 3.9+
- MongoDB (local or Atlas)
- Groq API Key (free from console.groq.com)

## Installation

### 1. Clone the Repository
```bash
git clone <your-repo-url>
cd Financial-ChatBot
```

### 2. Backend Setup (Node.js)
```bash
cd Backend
npm install
cp .env.example .env
# Edit .env with your configuration
```

### 3. Python AI Service Setup
```bash
cd ../Python-Backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your Groq API key
```

### 4. Frontend Setup
```bash
cd ../Frontend
npm install
cp .env.example .env
```

## Running the Application

### Start Python AI Service
```bash
cd Python-Backend
venv\Scripts\activate  # On Windows
python -m uvicorn app.main:app --host 0.0.0.0 --port 5000 --reload
```

### Start Node.js Backend
```bash
cd Backend
npm run dev
```

### Start Frontend
```bash
cd Frontend
npm run dev
```

Access the application at: `http://localhost:5173`

## Environment Variables

### Backend (.env)
```env
PORT=8000
NODE_ENV=development
MONGODB_URI=your_mongodb_connection_string
CORS_ORIGIN=http://localhost:5173
PYTHON_SERVICE_URL=http://localhost:5000
JWT_ACCESS_SECRET=your_secret_key
JWT_REFRESH_SECRET=your_refresh_secret
```

### Python Backend (.env)
```env
GROQ_API_KEY=your_groq_api_key
NODE_WEBHOOK_URL=http://localhost:8000
PORT=5000
LLM_MODEL=openai/gpt-oss-20b
OCR_PROVIDER=ocr_space
OCR_SPACE_API_KEY=your_ocr_api_key
```

### Frontend (.env)
```env
VITE_API_URL=/api/v1
VITE_BACKEND_ORIGIN=http://localhost:8000
```

## Project Structure

```
Financial-ChatBot/
├── Backend/                 # Node.js Express API
│   ├── src/
│   │   ├── config/         # Configuration files
│   │   ├── controllers/    # Route controllers
│   │   ├── middlewares/    # Express middlewares
│   │   ├── models/         # MongoDB models
│   │   ├── routes/         # API routes
│   │   ├── services/       # Business logic
│   │   ├── utils/          # Utility functions
│   │   └── validators/     # Input validation
│   └── package.json
│
├── Python-Backend/         # FastAPI AI Service
│   ├── app/
│   │   ├── api/           # API endpoints
│   │   ├── core/          # Core configuration
│   │   └── services/      # AI processing services
│   └── requirements.txt
│
├── Frontend/              # React application
│   ├── src/
│   │   ├── components/   # React components
│   │   ├── pages/        # Page components
│   │   ├── services/     # API services
│   │   └── utils/        # Utility functions
│   └── package.json
│
└── README.md
```

## API Endpoints

### Authentication
- POST `/api/v1/auth/register` - Register new user
- POST `/api/v1/auth/login` - User login
- POST `/api/v1/auth/logout` - User logout
- GET `/api/v1/auth/me` - Get current user

### Conversations
- GET `/api/v1/conversations` - List conversations
- POST `/api/v1/conversations` - Create conversation
- GET `/api/v1/conversations/:id` - Get conversation
- DELETE `/api/v1/conversations/:id` - Delete conversation

### Documents
- POST `/api/v1/documents/upload` - Upload document
- GET `/api/v1/documents/:id` - Get document
- DELETE `/api/v1/documents/:id` - Delete document

### Messages
- POST `/api/v1/conversations/:id/messages` - Send message
- GET `/api/v1/conversations/:id/messages` - Get messages

## Security Features

- JWT-based authentication
- Password hashing with bcrypt
- Rate limiting
- CORS protection
- Input validation
- SQL injection prevention
- XSS protection

## Deployment

See SETUP.md for detailed installation and configuration instructions.

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Documentation

- 📖 **[Complete Setup Guide](./docs/SETUP.md)** - Installation and configuration
- 🏗️ **[System Architecture](./docs/ARCHITECTURE.md)** - Technical design and architecture
- 📡 **[API Documentation](./docs/API.md)** - Complete API reference
- 🎓 **[Academic Project Report](./docs/ACADEMIC_PROJECT.md)** - Final year project documentation
- 📝 **[Project Status](./docs/PROJECT_STATUS.md)** - Current features and limitations
- 🤝 **[Contributing Guide](./docs/CONTRIBUTING.md)** - How to contribute
- 📋 **[Changelog](./docs/CHANGELOG.md)** - Version history

## Support

For issues, questions, or contributions, please open an issue on GitHub.

## Project Info

- **Version**: 2.0.0
- **Status**: Production Ready
- **Type**: Academic Final Year Project
- **Technologies**: React, Node.js, Python, MongoDB, FAISS, Groq AI
- **License**: MIT
