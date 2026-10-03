# API Documentation

Complete API reference for Financial ChatBot backend services.

## Base URLs

- **Development**: `http://localhost:8000/api/v1`
- **Production**: `https://your-domain.com/api/v1`

## Authentication

All authenticated endpoints require a valid JWT token in cookies or Authorization header.

```
Authorization: Bearer <access_token>
```

## Response Format

### Success Response
```json
{
  "success": true,
  "data": {},
  "message": "Success message"
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error message",
  "error": "Detailed error (development only)"
}
```

## Authentication Endpoints

### Register User
```
POST /auth/register
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "name": "John Doe"
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user_id",
      "email": "user@example.com",
      "name": "John Doe",
      "role": "user"
    }
  }
}
```

### Login
```
POST /auth/login
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user_id",
      "email": "user@example.com",
      "name": "John Doe",
      "role": "user"
    }
  }
}
```

### Logout
```
POST /auth/logout
```

**Response:** `200 OK`

### Get Current User
```
GET /auth/me
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user_id",
      "email": "user@example.com",
      "name": "John Doe",
      "role": "user"
    }
  }
}
```

### Update Profile
```
PATCH /auth/profile
```

**Request Body:**
```json
{
  "name": "John Updated"
}
```

### Change Password
```
POST /auth/change-password
```

**Request Body:**
```json
{
  "currentPassword": "old_password",
  "newPassword": "new_password"
}
```

### Forgot Password
```
POST /auth/forgot-password
```

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

### Reset Password
```
POST /auth/reset-password
```

**Request Body:**
```json
{
  "token": "reset_token",
  "newPassword": "new_password"
}
```

## Conversation Endpoints

### List Conversations
```
GET /conversations
```

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "conversations": [
      {
        "id": "conv_id",
        "title": "Q1 Financial Analysis",
        "createdAt": "2026-10-02T10:00:00Z",
        "updatedAt": "2026-10-02T10:30:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 5
    }
  }
}
```

### Create Conversation
```
POST /conversations
```

**Request Body:**
```json
{
  "title": "New Conversation"
}
```

**Response:** `201 Created`

### Get Conversation
```
GET /conversations/:id
```

**Response:** `200 OK`

### Update Conversation
```
PATCH /conversations/:id
```

**Request Body:**
```json
{
  "title": "Updated Title"
}
```

**Response:** `200 OK`

### Delete Conversation
```
DELETE /conversations/:id
```

**Response:** `204 No Content`

## Message Endpoints

### Get Messages
```
GET /conversations/:id/messages
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "messages": [
      {
        "id": "msg_id",
        "conversationId": "conv_id",
        "role": "user",
        "content": "What is the revenue?",
        "createdAt": "2026-10-02T10:00:00Z"
      },
      {
        "id": "msg_id_2",
        "conversationId": "conv_id",
        "role": "assistant",
        "content": "The revenue is $1.5M",
        "createdAt": "2026-10-02T10:00:05Z"
      }
    ]
  }
}
```

### Send Message
```
POST /conversations/:id/messages
```

**Request Body:**
```json
{
  "message": "What is the total revenue?",
  "context": {}
}
```

**Response:** `201 Created`

### Delete Message
```
DELETE /messages/:id
```

**Response:** `204 No Content`

## Document Endpoints

### Upload Document
```
POST /documents/upload
```

**Content-Type:** `multipart/form-data`

**Form Data:**
- `file`: Document file (PDF, Excel, CSV)
- `conversationId`: Conversation ID

**Response:** `201 Created`
```json
{
  "success": true,
  "data": {
    "document": {
      "id": "doc_id",
      "fileName": "financial_report.pdf",
      "fileType": "pdf",
      "fileSize": 1024000,
      "status": "processing",
      "conversationId": "conv_id"
    }
  }
}
```

### Get Document
```
GET /documents/:id
```

**Response:** `200 OK`

### Delete Document
```
DELETE /documents/:id
```

**Response:** `204 No Content`

### List Conversation Documents
```
GET /conversations/:id/documents
```

**Response:** `200 OK`

## Admin Endpoints

**Note:** All admin endpoints require `role: "admin"`

### Get Statistics
```
GET /admin/statistics
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "totalUsers": 150,
    "totalConversations": 500,
    "totalDocuments": 300,
    "activeUsers": 45
  }
}
```

### List All Users
```
GET /admin/users
```

**Query Parameters:**
- `page` (optional): Page number
- `limit` (optional): Items per page
- `search` (optional): Search by email or name

**Response:** `200 OK`

### Update User Status
```
PATCH /admin/users/:id/status
```

**Request Body:**
```json
{
  "isBlocked": true
}
```

**Response:** `200 OK`

### Update User Role
```
PATCH /admin/users/:id/role
```

**Request Body:**
```json
{
  "role": "admin"
}
```

**Response:** `200 OK`

### Delete User
```
DELETE /admin/users/:id
```

**Response:** `204 No Content`

## WebSocket Events

Connect to: `ws://localhost:8000` or `wss://your-domain.com`

### Client → Server Events

#### Join Conversation
```javascript
socket.emit('join_conversation', { conversationId: 'conv_id' });
```

#### Leave Conversation
```javascript
socket.emit('leave_conversation', { conversationId: 'conv_id' });
```

#### Typing Indicator
```javascript
socket.emit('typing', { conversationId: 'conv_id', isTyping: true });
```

### Server → Client Events

#### New Message
```javascript
socket.on('new_message', (data) => {
  // data: { message: {...}, conversationId: 'conv_id' }
});
```

#### Document Processed
```javascript
socket.on('document_processed', (data) => {
  // data: { documentId: 'doc_id', status: 'completed' }
});
```

#### User Typing
```javascript
socket.on('user_typing', (data) => {
  // data: { userId: 'user_id', isTyping: true }
});
```

## HTTP Status Codes

- `200 OK` - Successful request
- `201 Created` - Resource created successfully
- `204 No Content` - Successful deletion
- `400 Bad Request` - Invalid request data
- `401 Unauthorized` - Authentication required
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource not found
- `429 Too Many Requests` - Rate limit exceeded
- `500 Internal Server Error` - Server error

## Rate Limiting

- **Default Limit**: 100 requests per 15 minutes
- **Headers**:
  - `X-RateLimit-Limit`: Total requests allowed
  - `X-RateLimit-Remaining`: Remaining requests
  - `X-RateLimit-Reset`: Time when limit resets

## Error Codes

Custom error codes for specific scenarios:

- `AUTH_001` - Invalid credentials
- `AUTH_002` - Token expired
- `AUTH_003` - Invalid token
- `DOC_001` - Unsupported file type
- `DOC_002` - File too large
- `DOC_003` - Processing failed
- `CONV_001` - Conversation not found
- `USER_001` - User blocked
- `ADMIN_001` - Admin access required
