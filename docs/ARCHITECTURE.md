  # System Architecture

  ## Overview

  Financial ChatBot is a three-tier application consisting of a React frontend, Node.js API backend, and Python AI service.

  ## Architecture Diagram

  ```
  ┌─────────────────────────────────────────────────────────────┐
  │                     Client Browser                           │
  │                   (React Frontend)                           │
  │                  http://localhost:5173                       │
  └────────────────────┬────────────────────────────────────────┘
                      │ HTTP/WebSocket
                      │
  ┌────────────────────▼────────────────────────────────────────┐
  │                Node.js Backend (Express)                     │
  │                  http://localhost:8000                       │
  │  ┌──────────────────────────────────────────────────────┐  │
  │  │ - Authentication (JWT)                                │  │
  │  │ - User Management                                     │  │
  │  │ - Conversation Management                             │  │
  │  │ - Document Upload/Metadata                            │  │
  │  │ - Real-time Communication (Socket.IO)                 │  │
  │  │ - API Gateway                                         │  │
  │  └──────────────────────────────────────────────────────┘  │
  └────────┬─────────────────────────────────┬─────────────────┘
          │                                  │
          │ HTTP                             │ MongoDB
          │                                  │
  ┌────────▼──────────────────┐     ┌────────▼─────────────────┐
  │   Python AI Service       │     │    MongoDB Database       │
  │   (FastAPI + LangChain)   │     │                           │
  │   http://localhost:5000   │     │ - Users                   │
  │                           │     │ - Conversations           │
  │ ┌─────────────────────┐   │     │ - Messages                │
  │ │ - Document Processing│   │     │ - Documents               │
  │ │ - OCR (OCR.Space)    │   │     │                           │
  │ │ - LLM (Groq AI)      │   │     └───────────────────────────┘
  │ │ - Vector Store(FAISS)│   │
  │ │ - Embeddings         │   │
  │ └─────────────────────┘   │
  └───────────────────────────┘
  ```

  ## Component Details

  ### Frontend (React + Vite)

  **Technology Stack:**
  - React 18
  - Vite (build tool)
  - TailwindCSS (styling)
  - Axios (HTTP client)
  - Socket.IO Client (real-time)
  - Recharts (visualizations)

  **Key Features:**
  - Single Page Application (SPA)
  - Responsive design
  - Dark mode support
  - Real-time chat interface
  - Document upload UI
  - Data visualization
  - Admin dashboard

  **Directory Structure:**
  ```
  Frontend/src/
  ├── components/     # Reusable UI components
  ├── pages/          # Page components
  ├── services/       # API integration
  ├── hooks/          # Custom React hooks
  ├── context/        # React context providers
  ├── utils/          # Utility functions
  └── assets/         # Static assets
  ```

  ### Backend (Node.js + Express)

  **Technology Stack:**
  - Express.js (web framework)
  - MongoDB + Mongoose (database)
  - Socket.IO (WebSocket)
  - JWT (authentication)
  - Multer (file uploads)
  - Winston (logging)

  **Responsibilities:**
  - User authentication and authorization
  - API gateway for all client requests
  - Document metadata storage
  - Conversation and message management
  - Real-time communication
  - File upload handling
  - Request validation
  - Rate limiting
  - Error handling

  **Directory Structure:**
  ```
  Backend/src/
  ├── config/         # Configuration files
  ├── controllers/    # Route handlers
  ├── middlewares/    # Express middlewares
  ├── models/         # Mongoose schemas
  ├── routes/         # API routes
  ├── services/       # Business logic
  ├── utils/          # Helper functions
  └── validators/     # Input validation
  ```

  **Key Models:**
  - User: User accounts and profiles
  - Conversation: Chat conversations
  - Message: Chat messages
  - Document: Uploaded document metadata

  ### AI Service (Python + FastAPI)

  **Technology Stack:**
  - FastAPI (API framework)
  - LangChain (LLM framework)
  - Groq API (LLM provider)
  - FAISS (vector database)
  - PyMuPDF (PDF processing)
  - OCR.Space (OCR service)

  **Responsibilities:**
  - Document parsing (PDF, Excel, CSV)
  - Text extraction and chunking
  - OCR for scanned documents
  - Vector embeddings generation
  - Semantic search
  - LLM query processing
  - Response generation

  **Directory Structure:**
  ```
  Python-Backend/app/
  ├── api/            # API endpoints
  │   └── endpoints/  # Route handlers
  ├── core/           # Core configuration
  ├── services/       # AI services
  │   ├── parsers/    # Document parsers
  │   └── vector_store.py
  └── main.py         # Application entry
  ```

  ## Data Flow

  ### Document Upload Flow

  1. User selects file in Frontend
  2. Frontend uploads to Backend `/documents/upload`
  3. Backend saves file and creates metadata
  4. Backend forwards to Python service `/process-document`
  5. Python service:
    - Parses document
    - Extracts text and tables
    - Applies OCR if needed
    - Chunks text
    - Generates embeddings
    - Stores in FAISS
  6. Backend updates document status
  7. Frontend notified via webhook/polling

  ### Chat Message Flow

  1. User sends message in Frontend
  2. Message sent to Backend `/conversations/:id/messages`
  3. Backend:
    - Validates user and conversation
    - Saves message to MongoDB
    - Forwards to Python service `/chat`
  4. Python service:
    - Retrieves relevant document chunks from FAISS
    - Constructs prompt with context
    - Sends to Groq LLM
    - Returns AI response
  5. Backend saves AI response
  6. Frontend receives response via Socket.IO
  7. UI updates in real-time

  ## Authentication Flow

  1. User registers/logs in
  2. Backend validates credentials
  3. Backend generates JWT tokens:
    - Access token (15 min expiry)
    - Refresh token (7 days expiry)
  4. Tokens sent as HTTP-only cookies
  5. Frontend includes tokens in requests
  6. Backend middleware validates tokens
  7. Refresh token used to get new access token

  ## Security Measures

  ### Backend Security
  - JWT-based authentication
  - Password hashing (bcrypt)
  - HTTP-only cookies
  - CORS configuration
  - Rate limiting
  - Input validation (Zod)
  - SQL injection prevention
  - XSS protection (Helmet.js)

  ### Python Service Security
  - Webhook verification
  - Request validation
  - Error handling
  - Input sanitization

  ## Database Schema

  ### Users Collection
  ```javascript
  {
    _id: ObjectId,
    email: String (unique, indexed),
    password: String (hashed),
    name: String,
    role: String (enum: ['user', 'admin']),
    isBlocked: Boolean,
    createdAt: Date,
    updatedAt: Date
  }
  ```

  ### Conversations Collection
  ```javascript
  {
    _id: ObjectId,
    userId: ObjectId (ref: User, indexed),
    title: String,
    createdAt: Date,
    updatedAt: Date
  }
  ```

  ### Messages Collection
  ```javascript
  {
    _id: ObjectId,
    conversationId: ObjectId (ref: Conversation, indexed),
    role: String (enum: ['user', 'assistant']),
    content: String,
    createdAt: Date
  }
  ```

  ### Documents Collection
  ```javascript
  {
    _id: ObjectId,
    conversationId: ObjectId (ref: Conversation, indexed),
    userId: ObjectId (ref: User),
    fileName: String,
    originalName: String,
    fileType: String,
    fileSize: Number,
    filePath: String,
    status: String (enum: ['processing', 'completed', 'failed']),
    metadata: Object,
    createdAt: Date,
    updatedAt: Date
  }
  ```

  ## API Endpoints

  ### Authentication
  - POST `/api/v1/auth/register` - Register user
  - POST `/api/v1/auth/login` - Login
  - POST `/api/v1/auth/logout` - Logout
  - POST `/api/v1/auth/refresh` - Refresh token
  - GET `/api/v1/auth/me` - Get current user

  ### Conversations
  - GET `/api/v1/conversations` - List conversations
  - POST `/api/v1/conversations` - Create conversation
  - GET `/api/v1/conversations/:id` - Get conversation
  - PATCH `/api/v1/conversations/:id` - Update conversation
  - DELETE `/api/v1/conversations/:id` - Delete conversation

  ### Messages
  - GET `/api/v1/conversations/:id/messages` - Get messages
  - POST `/api/v1/conversations/:id/messages` - Send message
  - DELETE `/api/v1/messages/:id` - Delete message

  ### Documents
  - POST `/api/v1/documents/upload` - Upload document
  - GET `/api/v1/documents/:id` - Get document
  - DELETE `/api/v1/documents/:id` - Delete document
  - GET `/api/v1/conversations/:id/documents` - List documents

  ### Admin (requires admin role)
  - GET `/api/v1/admin/users` - List users
  - GET `/api/v1/admin/statistics` - Get statistics
  - PATCH `/api/v1/admin/users/:id/status` - Block/unblock user

  ### Python Service
  - POST `/process-document` - Process document
  - POST `/chat` - Generate AI response
  - POST `/delete-documents` - Delete from vector store
  - GET `/health` - Health check

  ## WebSocket Events

  ### Client → Server
  - `join_conversation` - Join conversation room
  - `leave_conversation` - Leave conversation room
  - `typing` - User typing indicator

  ### Server → Client
  - `new_message` - New message received
  - `message_updated` - Message edited
  - `user_typing` - Another user typing
  - `document_processed` - Document processing complete

  ## Error Handling

  ### HTTP Status Codes
  - 200: Success
  - 201: Created
  - 400: Bad Request
  - 401: Unauthorized
  - 403: Forbidden
  - 404: Not Found
  - 429: Too Many Requests
  - 500: Internal Server Error

  ### Error Response Format
  ```json
  {
    "success": false,
    "message": "Error description",
    "error": "Error details (dev only)"
  }
  ```

  ## Logging

  ### Backend Logging
  - Winston logger
  - Levels: error, warn, info, debug
  - File rotation
  - Console output (development)

  ### Python Service Logging
  - Python logging module
  - JSON formatted logs
  - Request/response logging

  ## Performance Considerations

  - Database indexes on frequently queried fields
  - Connection pooling for MongoDB
  - Lazy loading for large lists
  - Pagination for API responses
  - Chunking for large documents
  - Caching for vector searches
  - WebSocket for real-time updates (reduces polling)

  ## Scalability

  ### Horizontal Scaling
  - Stateless backend servers
  - Shared MongoDB database
  - Centralized vector store
  - Load balancer for distribution

  ### Optimization Strategies
  - CDN for static assets
  - Database query optimization
  - Vector store optimization
  - Async processing for documents
  - Background jobs for heavy tasks

  ## Monitoring & Observability

  ### Metrics to Track
  - API response times
  - Error rates
  - Document processing times
  - LLM response times
  - Active user count
  - Database query performance

  ### Health Checks
  - `/health` endpoints
  - Database connectivity
  - External service availability
  - Vector store status

  ## Deployment Architecture

  For production deployment, consider:
  - Frontend: Static hosting (Vercel, Netlify, Cloudflare Pages)
  - Backend: Node.js hosting (Railway, Render, AWS)
  - Python Service: Container hosting (Railway, Render, Google Cloud Run)
  - Database: MongoDB Atlas (managed)
  - Vector Store: FAISS (self-hosted) or Pinecone (managed)
