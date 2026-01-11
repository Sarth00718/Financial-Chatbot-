# FinChatBot - Node.js Backend (Updated)

A modern, local-only finance chatbot backend built with Node.js, Express, MongoDB, and Socket.IO.

## 🎯 Features

- **User Authentication**: JWT-based authentication with email verification
- **Real-time Chat**: Socket.IO for instant messaging
- **Document Management**: Upload and process financial documents (PDF, Excel, CSV)
- **Conversation Management**: Create, read, update, and delete conversations
- **Local Storage**: All files stored locally (no cloud dependencies)
- **AI Integration**: Connects to Python backend for AI responses

## 📁 Project Structure

```
Node-Backend-Updated/
├── src/
│   ├── config/
│   │   ├── constants.js          # Application constants
│   │   └── database.js           # MongoDB connection
│   ├── controllers/
│   │   ├── auth.controller.js    # Authentication logic
│   │   ├── conversation.controller.js  # Conversation management
│   │   ├── document.controller.js      # Document handling
│   │   └── socket.controller.js        # Socket.IO handlers
│   ├── middlewares/
│   │   ├── auth.middleware.js    # JWT verification
│   │   ├── errorHandler.middleware.js  # Error handling
│   │   └── upload.middleware.js        # File upload (multer)
│   ├── models/
│   │   ├── Conversation.model.js # Conversation schema
│   │   ├── Document.model.js     # Document schema
│   │   ├── Message.model.js      # Message schema
│   │   └── User.model.js         # User schema
│   ├── routes/
│   │   ├── auth.routes.js        # Auth endpoints
│   │   ├── conversation.routes.js # Conversation endpoints
│   │   └── document.routes.js    # Document endpoints
│   ├── utils/
│   │   ├── ApiError.js           # Custom error class
│   │   ├── ApiResponse.js        # Standard response format
│   │   ├── asyncHandler.js       # Async error wrapper
│   │   ├── emailService.js       # Email utilities
│   │   └── fileStorage.js        # Local file operations
│   ├── app.js                    # Express app setup
│   └── server.js                 # Server entry point
├── uploads/                      # Local file storage (auto-created)
├── .env.example                  # Environment variables template
├── .gitignore
├── package.json
└── README.md
```

## 🚀 Getting Started

### Prerequisites

- **Node.js**: v18 or higher
- **MongoDB**: v6 or higher (running locally or remotely)
- **npm**: v9 or higher

### Installation

1. **Navigate to the backend directory**:
   ```bash
   cd Node-Backend-Updated
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up environment variables**:
   ```bash
   # Copy the example file
   cp .env.example .env
   
   # Edit .env with your values
   ```

4. **Configure `.env` file**:
   ```env
   # Server Configuration
   PORT=8000

   # Database Configuration
   MONGODB_URI=mongodb://localhost:27017

   # CORS Configuration
   CORS_ORIGIN=http://localhost:5173

   # JWT Secrets (CHANGE THESE!)
   JWT_SECRET=your-super-secret-jwt-key-here
   ACCESS_TOKEN_SECRET=your-access-token-secret-here
   ACCESS_TOKEN_EXPIRY=1d
   REFRESH_TOKEN_SECRET=your-refresh-token-secret-here
   REFRESH_TOKEN_EXPIRY=10d

   # Email Configuration (for Gmail)
   EMAIL_ID_FOR_VERIFICATION=your-email@gmail.com
   EMAIL_PASSWORD_FOR_VERIFICATION=your-app-password

   # Python Backend URL
   PYTHON_SERVICE_URL=http://localhost:5000
   ```

### Running the Server

**Development mode** (with auto-restart):
```bash
npm run dev
```

**Production mode**:
```bash
npm start
```

The server will start on `http://localhost:8000`

## 📧 Email Configuration

To enable email verification and password reset:

1. **Enable 2-Factor Authentication** on your Gmail account
2. **Generate an App Password**:
   - Go to Google Account Settings
   - Security → 2-Step Verification → App passwords
   - Generate a new app password
3. **Add to `.env`**:
   ```env
   EMAIL_ID_FOR_VERIFICATION=your-email@gmail.com
   EMAIL_PASSWORD_FOR_VERIFICATION=your-16-char-app-password
   ```

## 🗄️ MongoDB Setup

### Option 1: Local MongoDB

1. **Install MongoDB**:
   - Download from [mongodb.com](https://www.mongodb.com/try/download/community)
   - Follow installation instructions for your OS

2. **Start MongoDB**:
   ```bash
   # Windows
   mongod

   # macOS/Linux
   sudo systemctl start mongod
   ```

3. **Use in `.env`**:
   ```env
   MONGODB_URI=mongodb://localhost:27017
   ```

### Option 2: MongoDB Atlas (Cloud)

1. Create free account at [mongodb.com/atlas](https://www.mongodb.com/cloud/atlas)
2. Create a cluster
3. Get connection string
4. Use in `.env`:
   ```env
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net
   ```

## 🔌 API Endpoints

### Authentication
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - Login user
- `POST /api/v1/auth/logout` - Logout user
- `GET /api/v1/auth/verify-email` - Verify email
- `POST /api/v1/auth/forgot-password` - Request password reset
- `POST /api/v1/auth/reset-password` - Reset password
- `GET /api/v1/auth/me` - Get current user

### Conversations
- `GET /api/v1/conversations` - Get all conversations
- `POST /api/v1/conversations` - Create new conversation
- `GET /api/v1/conversations/:id` - Get conversation details
- `PATCH /api/v1/conversations/:id` - Update conversation
- `DELETE /api/v1/conversations/:id` - Delete conversation
- `POST /api/v1/conversations/:id/messages` - Send message

### Documents
- `POST /api/v1/documents/upload` - Upload documents
- `GET /api/v1/documents/conversation/:id` - Get conversation documents
- `DELETE /api/v1/documents/:id` - Delete document
- `PATCH /api/v1/documents/:id/status` - Update status (webhook)

### Health Check
- `GET /api/v1/health` - Server health status

## 🔄 Socket.IO Events

### Client → Server
- `joinConversation` - Join a conversation room
- `leaveConversation` - Leave a conversation room
- `sendMessage` - Send a chat message

### Server → Client
- `newMessage` - New message received
- `chatError` - Error occurred

## 🛠️ Development Tips

### Testing API Endpoints

Use **Postman** or **Thunder Client** (VS Code extension):

1. **Register a user**:
   ```
   POST http://localhost:8000/api/v1/auth/register
   Body: {
     "fullName": "John Doe",
     "email": "john@example.com",
     "userName": "johndoe",
     "password": "password123"
   }
   ```

2. **Login**:
   ```
   POST http://localhost:8000/api/v1/auth/login
   Body: {
     "email": "john@example.com",
     "password": "password123"
   }
   ```

3. **Use the returned `accessToken` in headers**:
   ```
   Authorization: Bearer <your-access-token>
   ```

### Viewing Logs

The server logs important events:
- ✅ Successful operations (green)
- ❌ Errors (red)
- ⚠️  Warnings (yellow)
- 📍 Information (blue)

### Common Issues

**MongoDB connection failed**:
- Ensure MongoDB is running
- Check connection string in `.env`

**Email not sending**:
- Verify Gmail app password
- Check email credentials in `.env`

**File upload fails**:
- Check `uploads/` directory exists
- Verify file size < 50MB

## 📦 Dependencies

### Core
- `express` - Web framework
- `mongoose` - MongoDB ODM
- `socket.io` - Real-time communication
- `jsonwebtoken` - JWT authentication
- `bcryptjs` - Password hashing

### Middleware
- `cors` - Cross-origin resource sharing
- `cookie-parser` - Parse cookies
- `multer` - File upload handling

### Utilities
- `axios` - HTTP client (for Python backend)
- `nodemailer` - Email sending
- `uuid` - Unique ID generation
- `dotenv` - Environment variables

### Development
- `nodemon` - Auto-restart on changes

## 🔐 Security Notes

- **Never commit `.env` file** to version control
- **Change default JWT secrets** in production
- **Use HTTPS** in production
- **Validate all user inputs**
- **Keep dependencies updated**

## 📝 License

ISC

## 👥 Authors

FinChatBot Team

---

**Need help?** Check the logs or create an issue!
