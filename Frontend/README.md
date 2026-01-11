# FinChatBot - Frontend (Updated)

A modern, clean React frontend for the FinChatBot financial AI assistant.

## 🎯 Features

- **Modern UI**: Clean, responsive design with Tailwind CSS
- **Real-time Chat**: Interactive chat interface with AI responses
- **Document Upload**: Drag-and-drop file upload for PDFs and Excel files
- **User Authentication**: Secure login and registration
- **Conversation Management**: Create, view, and delete conversations
- **Responsive Design**: Works on desktop, tablet, and mobile
- **Dark Theme**: Easy on the eyes with a modern dark interface

## 📁 Project Structure

```
Frontend-Updated/
├── src/
│   ├── components/
│   │   ├── ChatInput.jsx        # Message input with file upload
│   │   ├── Message.jsx           # Individual message display
│   │   ├── ProtectedRoute.jsx    # Route protection
│   │   └── Sidebar.jsx           # Conversations sidebar
│   ├── context/
│   │   └── AuthContext.jsx       # Authentication state management
│   ├── pages/
│   │   ├── ChatPage.jsx          # Main chat interface
│   │   ├── EmailVerificationPage.jsx  # Email verification
│   │   ├── LandingPage.jsx       # Home page
│   │   ├── LoginPage.jsx         # Login form
│   │   └── SignupPage.jsx        # Registration form
│   ├── utils/
│   │   └── api.js                # API client (axios)
│   ├── index.css                 # Global styles
│   └── main.jsx                  # Application entry point
├── index.html
├── package.json
├── tailwind.config.js
├── vite.config.js
└── README.md
```

## 🚀 Getting Started

### Prerequisites

- **Node.js**: v18 or higher
- **npm**: v9 or higher
- **Backend**: Node.js and Python backends running

### Installation

1. **Navigate to the frontend directory**:
   ```bash
   cd Frontend-Updated
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up environment variables**:
   ```bash
   # Copy the example file
   cp .env.example .env
   
   # Edit .env with your backend URL
   ```

4. **Configure `.env` file**:
   ```env
   VITE_API_URL=http://localhost:8000/api/v1
   ```

### Running the App

**Development mode** (with hot reload):
```bash
npm run dev
```

The app will start on `http://localhost:5173`

**Build for production**:
```bash
npm run build
```

**Preview production build**:
```bash
npm run preview
```

## 🎨 Tech Stack

### Core
- **React 18**: Modern React with hooks
- **Vite**: Fast build tool and dev server
- **React Router**: Client-side routing

### Styling
- **Tailwind CSS**: Utility-first CSS framework
- **Custom CSS**: Additional styles for animations

### HTTP & State
- **Axios**: HTTP client for API requests
- **Context API**: Global state management

### UI Components
- **Lucide React**: Beautiful icon library
- **React Markdown**: Markdown rendering for AI responses

## 📡 API Integration

The frontend communicates with the Node.js backend:

### Authentication Endpoints
- `POST /auth/register` - Register new user
- `POST /auth/login` - Login user
- `POST /auth/logout` - Logout user
- `GET /auth/me` - Get current user
- `GET /auth/verify-email` - Verify email

### Conversation Endpoints
- `GET /conversations` - Get all conversations
- `POST /conversations` - Create new conversation
- `GET /conversations/:id` - Get conversation with messages
- `DELETE /conversations/:id` - Delete conversation
- `POST /conversations/:id/messages` - Send message

### Document Endpoints
- `POST /documents/upload` - Upload documents
- `GET /documents/conversation/:id` - Get documents
- `DELETE /documents/:id` - Delete document

## 🎓 Understanding the Code

### Component Structure

**ChatPage.jsx** - Main chat interface
- Manages conversations and messages
- Handles user input and file uploads
- Communicates with backend API

**Sidebar.jsx** - Navigation sidebar
- Lists all conversations
- Create new conversation
- Delete conversations
- User profile and logout

**ChatInput.jsx** - Message input
- Text input with auto-resize
- File upload with preview
- Send button with loading state

**Message.jsx** - Message display
- Different styles for user/assistant/system
- Markdown rendering for AI responses
- Avatar icons

### State Management

**AuthContext** - Authentication state
- User information
- Login/logout functions
- Token management
- Protected route logic

### API Client

**api.js** - Centralized API calls
- Axios instance with interceptors
- Automatic token refresh
- Error handling
- Request/response formatting

## 🎨 Styling

### Tailwind CSS
The app uses Tailwind CSS for styling:

```jsx
// Example: Button with Tailwind classes
<button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg">
  Click Me
</button>
```

### Custom Classes
Additional custom classes in `index.css`:

- `.btn-primary` - Primary button style
- `.btn-secondary` - Secondary button style
- `.btn-ghost` - Ghost button style
- `.input-field` - Input field style
- `.card` - Card container style
- `.gradient-text` - Gradient text effect
- `.message-user` - User message bubble
- `.message-assistant` - AI message bubble
- `.message-system` - System message style

### Dark Theme
The entire app uses a dark theme:
- Background: `bg-gray-950`
- Cards: `bg-gray-900`
- Borders: `border-gray-800`
- Text: `text-gray-100`

## 🔧 Development Tips

### Hot Reload
Vite provides instant hot module replacement (HMR):
- Save a file and see changes immediately
- No need to refresh the browser

### Component Development
Create new components in `src/components/`:

```jsx
// Example: NewComponent.jsx
const NewComponent = ({ prop1, prop2 }) => {
  return (
    <div className="card">
      <h2>{prop1}</h2>
      <p>{prop2}</p>
    </div>
  );
};

export default NewComponent;
```

### Adding New Pages
1. Create page in `src/pages/`
2. Add route in `src/main.jsx`
3. Link to page using `<Link to="/path">`

### API Calls
Use the API client for all backend requests:

```jsx
import { conversationAPI } from '../utils/api';

// Get all conversations
const conversations = await conversationAPI.getAll();

// Create new conversation
const newConvo = await conversationAPI.create({ title: 'New Chat' });
```

## 🐛 Troubleshooting

### Port Already in Use
```
Error: Port 5173 is already in use
```
**Solution**: Change port in `vite.config.js` or kill the process using port 5173

### API Connection Failed
```
Error: Network Error
```
**Solution**: 
1. Check if Node.js backend is running on port 8000
2. Verify `VITE_API_URL` in `.env`
3. Check CORS settings in backend

### Build Errors
```
Error: Cannot find module
```
**Solution**: 
1. Delete `node_modules` and `package-lock.json`
2. Run `npm install` again

### Styling Not Working
```
Tailwind classes not applying
```
**Solution**:
1. Check `tailwind.config.js` content paths
2. Restart dev server
3. Clear browser cache

## 📱 Responsive Design

The app is fully responsive:

### Desktop (≥768px)
- Sidebar always visible
- Wide chat area
- Full feature set

### Tablet (768px - 1024px)
- Collapsible sidebar
- Optimized layout
- Touch-friendly buttons

### Mobile (<768px)
- Overlay sidebar
- Stacked layout
- Mobile-optimized input

## 🎯 Key Features Explained

### Authentication Flow
1. User registers → Email sent
2. User verifies email → Account activated
3. User logs in → Tokens stored
4. Protected routes check auth
5. Auto token refresh on expiry

### Chat Flow
1. User selects/creates conversation
2. Messages loaded from backend
3. User types message
4. Message sent to backend
5. AI processes and responds
6. Response displayed in chat

### File Upload Flow
1. User selects files
2. Files previewed
3. User confirms upload
4. Files sent to backend
5. Backend processes documents
6. Status updates shown

## 🔐 Security

- **JWT Tokens**: Secure authentication
- **HTTP-only Cookies**: XSS protection
- **CORS**: Restricted origins
- **Input Validation**: Client-side validation
- **Protected Routes**: Auth required

## 📝 License

ISC

## 👥 Authors

FinChatBot Team

---

**Need help?** Check the browser console for errors or review the API documentation!
