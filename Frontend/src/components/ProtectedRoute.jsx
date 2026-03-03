/**
 * Protected Route Component
 * Redirects to login if user is not authenticated.
 * Loading screen uses CSS variables for theme-safe rendering.
 */

import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Bot } from 'lucide-react';

const ProtectedRoute = ({ children, adminOnly = false }) => {
  const { isAuthenticated, loading, isAdmin } = useAuth();

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: 'var(--color-bg-page)', transition: 'background-color 0.25s ease' }}
      >
        <div className="text-center animate-fadeIn">
          {/* Animated logo */}
          <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center shadow-xl">
            <Bot className="w-8 h-8 text-white" />
          </div>
          {/* Spinner */}
          <div
            className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin mx-auto mb-4"
            style={{ borderColor: 'var(--color-border)', borderTopColor: '#2563eb' }}
          />
          <p className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>
            Loading…
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (adminOnly && !isAdmin) return <Navigate to="/" replace />;

  return children;
};

export default ProtectedRoute;
