# FinChatBot - Process Pipeline Overview

## 🎯 System Architecture

```
┌──────────────┐
│   Frontend   │  React + Vite (Port 5173)
│  (User UI)   │  • Login/Register • Chat Interface • Document Upload
└──────┬───────┘
       │ HTTP/WebSocket
┌──────▼───────┐
│   Backend    │  Node.js + Express (Port 8000)
│  (API Layer) │  • Authentication • Conversations • Real-time Chat
└──────┬───────┘
       │ HTTP API
┌──────▼───────┐
│  AI Service  │  Python + FastAPI (Port 5000)
│ (Processing) │  • Document Processing • Vector Search • AI Models
└──────────────┘
```

---

## 📋 Core Workflows

### 1️⃣ User Authentication Flow

```
User Registration
├─ User fills form → Frontend validates
├─ POST /api/v1/auth/register → Backend
├─ Password hashed (bcrypt) → Saved to MongoDB
├─ Verification email sent → User inbox
└─ User clicks link → Email verified → Login enabled

User Login
├─ User enters credentials → Frontend
├─ POST /api/v1/auth/login → Backend
├─ Password verified → JWT tokens generated
│  ├─ Access Token (1 day)
│  └─ Refresh Token (10 days)
└─ Tokens stored → User redirected to chat
```

### 2️⃣ Document Upload & Processing Flow

```
Upload Phase
├─ User selects PDF/Excel → Frontend validates (type, size)
├─ POST /api/v1/documents/upload → Backend
├─ Multer saves file → uploads/ directory
├─ Document record created → MongoDB (status: "processing")
└─ File path sent → Python service

Processing Phase (Python)
├─ POST /process-document received
├─ File loaded → Type detected (PDF/Excel/CSV)
├─ Text Extraction
│  ├─ PDF: PyMuPDF extracts text + images
│  ├─ Images analyzed: Groq Vision → Gemini Vision (fallback)
│  └─ Excel/CSV: Pandas converts to text
├─ Text Chunking (1000 chars, 200 overlap)
├─ Generate Embeddings (HuggingFace model)
├─ Store in FAISS Vector Database (local)
└─ Webhook → Backend updates status to "completed"
```

### 3️⃣ Query & Response Flow (RAG Pipeline)

```
Query Submission
├─ User types question → Frontend
├─ Socket.IO emits message → Backend
├─ Message saved to MongoDB
└─ Query sent → Python service

RAG Processing
├─ POST /query received
├─ Query embedded → Same HuggingFace model
├─ Vector Search → FAISS finds top 5 relevant chunks
├─ Context built → Retrieved documents formatted
├─ Prompt created → Context + History + Question
└─ LLM Inference
   ├─ Try Groq first (llama-3.3-70b) → Fast (1-2s)
   └─ If fails → Gemini (gemini-2.0-flash) → Reliable

Response Delivery
├─ AI answer generated → Python service
├─ Response sent → Backend
├─ Message saved → MongoDB
├─ Socket.IO broadcasts → All clients in room
└─ Frontend displays → Markdown formatted
```

---

## 🤖 AI Model Strategy

### Dual-Model Approach

| Feature | Groq (Primary) | Gemini (Fallback) |
|---------|---------------|-------------------|
| **Speed** | ⚡ Very Fast (1-2s) | ⚡ Fast (2-4s) |
| **LLM Model** | llama-3.3-70b-versatile | gemini-2.0-flash-exp |
| **Vision Model** | llama-3.2-90b-vision | gemini-2.0-flash-exp |
| **Use Case** | Primary for all queries | Fallback + complex tasks |
| **Cost** | Free tier | Free tier |

### Decision Flow

```
Image Analysis:
Groq Vision → Check quality → Low? → Gemini Vision

Text Generation:
Groq LLM → API error? → Gemini LLM
```

---

## 🔄 Real-Time Communication

### Socket.IO Events

```
Client → Server
├─ joinConversation: Join chat room
├─ leaveConversation: Leave chat room
└─ sendMessage: Send user message

Server → Client
├─ newMessage: Broadcast new message
├─ documentStatusUpdate: Processing complete
└─ chatError: Error occurred
```

---

## 💾 Data Storage

### MongoDB Collections
- **Users**: Authentication, profile
- **Conversations**: Chat sessions
- **Messages**: Chat history
- **Documents**: File metadata

### Local Storage
- **uploads/**: Original documents
- **vector_store/**: FAISS indices (per conversation)

---

## 🔐 Security Features

```
Authentication
├─ JWT tokens (access + refresh)
├─ Bcrypt password hashing (10 rounds)
├─ Email verification required
└─ Token rotation on refresh

API Security
├─ CORS whitelist
├─ Input validation (Pydantic)
├─ File type/size limits
└─ Rate limiting

Data Protection
├─ Local-only storage (no cloud)
├─ HTTPS in production
└─ Encrypted connections
```

---

## 📊 Performance Metrics

| Operation | Time | Notes |
|-----------|------|-------|
| **Document Upload** | < 1s | File save to disk |
| **PDF Processing** | 10-30s | Depends on pages/images |
| **Excel Processing** | 5-15s | Depends on rows |
| **Vector Search** | < 100ms | FAISS local search |
| **AI Response (Groq)** | 1-2s | Very fast inference |
| **AI Response (Gemini)** | 2-4s | Fallback option |

---

## 🚀 Quick Start Commands

```bash
# Backend (Node.js)
cd Backend
npm install
npm run dev  # Port 8000

# Python Service
cd Python-Backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python app/main.py  # Port 5000

# Frontend
cd Frontend
npm install
npm run dev  # Port 5173
```

---

## 🔧 Environment Variables

### Backend (.env)
```env
PORT=8000
MONGODB_URI=mongodb://localhost:27017
JWT_SECRET=your-secret-key
PYTHON_SERVICE_URL=http://localhost:5000
```

### Python (.env)
```env
GROQ_API_KEY=your-groq-key
GOOGLE_API_KEY=your-gemini-key
NODE_WEBHOOK_URL=http://localhost:8000
```

### Frontend (.env)
```env
VITE_API_URL=http://localhost:8000/api/v1
```

---

## 📱 Responsive Design

### Breakpoints
- **Mobile**: < 768px (Stacked layout, overlay sidebar)
- **Tablet**: 768px - 1024px (Collapsible sidebar)
- **Desktop**: ≥ 1024px (Fixed sidebar, wide chat)

### Mobile Optimizations
- Touch-friendly buttons (min 44px)
- Swipe gestures for sidebar
- Optimized file upload UI
- Responsive message bubbles
- Bottom navigation

---

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| **MongoDB connection failed** | Check MongoDB is running, verify URI |
| **Python service not responding** | Verify API keys, check port 5000 |
| **File upload fails** | Check uploads/ exists, verify file size < 50MB |
| **AI not responding** | Check API keys valid, review Python logs |
| **Real-time not working** | Check Socket.IO connection, verify WebSocket |

---

## 📈 Scaling Considerations

### Horizontal Scaling
- Multiple Node.js instances + Load balancer
- Multiple Python workers + Queue system (Celery)
- CDN for frontend static assets

### Vertical Scaling
- Increase server resources (CPU/RAM)
- Optimize database queries + indexing
- Cache frequent queries (Redis)

---

## 📝 API Endpoints Summary

### Authentication
- `POST /api/v1/auth/register` - Register user
- `POST /api/v1/auth/login` - Login user
- `GET /api/v1/auth/me` - Get current user

### Conversations
- `GET /api/v1/conversations` - List all
- `POST /api/v1/conversations` - Create new
- `DELETE /api/v1/conversations/:id` - Delete

### Documents
- `POST /api/v1/documents/upload` - Upload files
- `GET /api/v1/documents/conversation/:id` - Get docs
- `DELETE /api/v1/documents/:id` - Delete doc

### AI Service
- `POST /process-document` - Process uploaded file
- `POST /query` - Ask question with RAG
- `POST /delete-document` - Remove vectors

---

**Version**: 2.0.0  
**Last Updated**: January 2026  
**Documentation**: See README.md for detailed setup
