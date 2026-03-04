/**
 * Application Entry Point
 * Sets up React Router, Context providers, and renders the app.
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import './index.css';

// Context providers
import { AuthProvider }  from './contexts/AuthContext';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';

// Route components
import ProtectedRoute from './components/ProtectedRoute';

// Pages
import LoginPage         from './pages/LoginPage';
import RegisterPage      from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import ChatPage          from './pages/ChatPage';
import AdminDashboard    from './pages/AdminDashboard';
import UserDashboard     from './pages/UserDashboard';

/**
 * Theme-aware Toaster that reads from ThemeContext.
 * Placed inside ThemeProvider so it can consume the hook.
 */
const ThemedToaster = () => {
  const { isDark } = useTheme();
  return (
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 3000,
        style: {
          background: isDark ? '#1e293b' : '#ffffff',
          color:      isDark ? '#f1f5f9' : '#0f172a',
          border:     isDark ? '1px solid #334155' : '1px solid #e2e8f0',
          borderRadius: '0.75rem',
          fontSize:   '0.875rem',
          boxShadow:  isDark
            ? '0 10px 15px -3px rgba(0,0,0,0.4)'
            : '0 10px 15px -3px rgba(0,0,0,0.07)',
        },
        success: {
          duration: 3000,
          iconTheme: { primary: '#10b981', secondary: isDark ? '#1e293b' : '#fff' },
        },
        error: {
          duration: 4000,
          iconTheme: { primary: '#ef4444', secondary: isDark ? '#1e293b' : '#fff' },
        },
      }}
    />
  );
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <ThemeProvider>
        <AuthProvider>
          <ThemedToaster />
          <Routes>
            {/* Public routes */}
            <Route path="/login"          element={<LoginPage />} />
            <Route path="/register"       element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />

            {/* Protected routes */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <ChatPage />
                </ProtectedRoute>
              }
            />

            {/* User Dashboard */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <UserDashboard />
                </ProtectedRoute>
              }
            />

            {/* Admin routes */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute adminOnly={true}>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>
);
