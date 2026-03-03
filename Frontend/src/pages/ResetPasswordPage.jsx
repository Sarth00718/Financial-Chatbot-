/**
 * Reset Password Page
 * Reset password using token from email — fully themed, light/dark aware.
 */

import { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Bot, Lock, Eye, EyeOff, CheckCircle, AlertTriangle } from 'lucide-react';
import ThemeToggle from '../components/ThemeToggle';

const ResetPasswordPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { resetPassword } = useAuth();
  const token = searchParams.get('token');

  const [formData, setFormData] = useState({ password: '', confirmPassword: '' });
  const [showPwd, setShowPwd]   = useState(false);
  const [showCPwd, setShowCPwd] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [success, setSuccess]   = useState(false);

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const result = await resetPassword({ token, ...formData });
    if (result.success) {
      setSuccess(true);
      setTimeout(() => navigate('/login'), 3000);
    }
    setLoading(false);
  };

  const pageStyle = {
    backgroundColor: 'var(--color-bg-page)',
    transition: 'background-color 0.25s ease',
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2.5rem 1rem',
    position: 'relative',
  };

  /* ---- No token ---- */
  if (!token) {
    return (
      <div style={pageStyle}>
        <div className="absolute top-4 right-4"><ThemeToggle /></div>
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center shadow-xl">
              <AlertTriangle className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold mb-1.5" style={{ color: 'var(--color-text-primary)' }}>
              Invalid Link
            </h1>
            <p style={{ color: 'var(--color-text-secondary)' }}>
              This reset link is invalid or has expired.
            </p>
          </div>
          <div className="card p-8 text-center">
            <Link to="/forgot-password" className="btn-primary inline-flex">
              Request a New Link
            </Link>
          </div>
        </div>
      </div>
    );
  }

  /* ---- Success ---- */
  if (success) {
    return (
      <div style={pageStyle}>
        <div className="absolute top-4 right-4"><ThemeToggle /></div>
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center shadow-xl">
              <CheckCircle className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold mb-1.5" style={{ color: 'var(--color-text-primary)' }}>
              Password Reset!
            </h1>
            <p style={{ color: 'var(--color-text-secondary)' }}>
              Your password has been successfully reset.
            </p>
          </div>
          <div className="card p-8 text-center space-y-4">
            <p style={{ color: 'var(--color-text-secondary)' }}>Redirecting to login page…</p>
            <Link to="/login" className="btn-primary inline-flex">
              Go to Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  /* ---- Form ---- */
  return (
    <div style={pageStyle}>
      <div className="absolute top-4 right-4"><ThemeToggle /></div>

      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center shadow-xl">
            <Bot className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold mb-1.5" style={{ color: 'var(--color-text-primary)' }}>
            Reset Password
          </h1>
          <p style={{ color: 'var(--color-text-secondary)' }}>Enter your new password below</p>
        </div>

        <div className="card p-8">
          <form onSubmit={handleSubmit} className="space-y-5">

            {/* New Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                New Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)', width: '1.1rem', height: '1.1rem' }} />
                <input
                  id="password"
                  name="password"
                  type={showPwd ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  minLength={6}
                  className="input-field pl-10 pr-11"
                  placeholder="••••••••"
                />
                <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 icon-btn p-0">
                  {showPwd ? <EyeOff style={{ width: '1.1rem', height: '1.1rem' }} /> : <Eye style={{ width: '1.1rem', height: '1.1rem' }} />}
                </button>
              </div>
              <p className="mt-1 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                At least 6 characters with uppercase, lowercase, and number
              </p>
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                Confirm New Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)', width: '1.1rem', height: '1.1rem' }} />
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showCPwd ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                  className="input-field pl-10 pr-11"
                  placeholder="••••••••"
                />
                <button type="button" onClick={() => setShowCPwd(!showCPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 icon-btn p-0">
                  {showCPwd ? <EyeOff style={{ width: '1.1rem', height: '1.1rem' }} /> : <Eye style={{ width: '1.1rem', height: '1.1rem' }} />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full py-3 text-base">
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Resetting…
                </span>
              ) : (
                'Reset Password'
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link to="/login" className="text-sm font-medium transition-colors" style={{ color: 'var(--color-text-secondary)' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-text-primary)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-text-secondary)')}
            >
              Back to login
            </Link>
          </div>
        </div>

        <p className="text-center text-xs mt-8" style={{ color: 'var(--color-text-muted)' }}>
          © {new Date().getFullYear()} FinChatBot. All rights reserved.
        </p>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
