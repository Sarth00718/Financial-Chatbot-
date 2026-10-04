/**
 * Application Entry Point
 * Sets up React Router, Context providers, and renders the app.
 *
 * IMPORTANT: ChatPage manages its own Sidebar internally, so it is
 * intentionally NOT wrapped in AppLayout (which would add a 2nd sidebar).
 * All other pages (Dashboard, Executive, Bookmarks, Watchlist, Admin)
 * do NOT have internal sidebars and therefore DO use AppLayout.
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import './index.css';

// Context providers
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';

// Route components
import ProtectedRoute from './components/ProtectedRoute';

// Pages
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ChatPage from './pages/ChatPage';
import AdminDashboard from './pages/AdminDashboard';
import UserDashboard from './pages/UserDashboard';
import ExecutiveDashboard from './pages/ExecutiveDashboard';
import MuiThemeWrapper from './theme/MuiThemeWrapper';
import ErrorBoundary from './components/ErrorBoundary';
import AppLayout from './components/layout/AppLayout';

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
        <MuiThemeWrapper>
        <AuthProvider>
          <ThemedToaster />
          <ErrorBoundary>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            {/* ============================================================
                ChatPage: Has its own integrated Sidebar — NO AppLayout wrapper.
                Adding AppLayout here would create a duplicate sidebar.
                ============================================================ */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <ChatPage />
                </ProtectedRoute>
              }
            />

            {/* ============================================================
                All other protected pages: use AppLayout for navigation.
                These pages do NOT render their own sidebar.
                ============================================================ */}

            {/* User Dashboard */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <UserDashboard />
                  </AppLayout>
                </ProtectedRoute>
              }
            />

            {/* Enterprise routes */}
            <Route
              path="/executive"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <ExecutiveDashboard />
                  </AppLayout>
                </ProtectedRoute>
              }
            />


            {/* Admin routes */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute adminOnly={true}>
                  <AppLayout>
                    <AdminDashboard />
                  </AppLayout>
                </ProtectedRoute>
              }
            />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          </ErrorBoundary>
        </AuthProvider>
        </MuiThemeWrapper>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>
);
