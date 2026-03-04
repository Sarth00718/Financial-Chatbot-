/**
 * Login Page
 * Premium auth UI — glassmorphism card, animated background, fully themed.
 */

import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { BarChart3, Mail, Lock, Eye, EyeOff, TrendingUp, FileText, ShieldCheck } from 'lucide-react';
import ThemeToggle from '../components/ThemeToggle';

const FEATURES = [
  { icon: FileText,   label: 'PDF & Scanned Document Analysis' },
  { icon: TrendingUp, label: 'Financial Chart & Table Extraction' },
  { icon: ShieldCheck,label: 'Secure, Private, No Data Sharing' },
];

const LoginPage = () => {
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuth();

  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [showPwd, setShowPwd]   = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  useEffect(() => {
    if (isAuthenticated) navigate('/');
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const result = await login({ email, password });
    if (!result.success) {
      setError(result.error || 'Invalid email or password. Please try again.');
    }
    setLoading(false);
  };

  return (
    <div className="page-auth">
      {/* Theme toggle */}
      <div className="absolute top-4 right-4 z-20">
        <ThemeToggle />
      </div>

      {/* Decorative background blobs */}
      <div
        className="absolute top-[-10%] left-[-8%] w-80 h-80 rounded-full animate-blob opacity-40 pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(37,99,235,0.35) 0%, transparent 70%)' }}
      />
      <div
        className="absolute bottom-[-12%] right-[-6%] w-96 h-96 rounded-full animate-blob opacity-30 pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(99,102,241,0.35) 0%, transparent 70%)',
          animationDelay: '3s',
        }}
      />

      <div className="relative z-10 w-full max-w-md animate-fadeInUp">
        {/* Logo + heading */}
        <div className="text-center mb-8">
          <div className="brand-icon mx-auto mb-4">
            <BarChart3 className="w-8 h-8 text-white" />
          </div>
          <h1
            className="text-3xl font-bold mb-1.5 tracking-tight"
            style={{ color: 'var(--color-text-primary)' }}
          >
            Welcome back
          </h1>
          <p style={{ color: 'var(--color-text-secondary)' }}>
            Sign in to your FinChatBot account
          </p>
        </div>

        {/* Auth card */}
        <div className="auth-card">
          {/* Error banner */}
          {error && (
            <div
              className="mb-5 px-4 py-3 rounded-lg text-sm font-medium animate-fadeIn"
              style={{ backgroundColor: 'var(--color-error-bg)', color: 'var(--color-error-text)' }}
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-semibold mb-1.5"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                Email Address
              </label>
              <div className="relative">
                <Mail
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4"
                  style={{ color: 'var(--color-text-muted)' }}
                />
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(''); }}
                  className="input-field pl-10"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="password"
                  className="text-sm font-semibold"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  className="text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4"
                  style={{ color: 'var(--color-text-muted)' }}
                />
                <input
                  id="password"
                  type={showPwd ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(''); }}
                  className="input-field pl-10 pr-11"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 icon-btn p-1"
                  aria-label={showPwd ? 'Hide password' : 'Show password'}
                >
                  {showPwd
                    ? <EyeOff className="w-4 h-4" />
                    : <Eye className="w-4 h-4" />
                  }
                </button>
              </div>
            </div>

            {/* Remember me */}
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                id="remember"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="w-4 h-4 rounded accent-blue-600"
              />
              <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                Remember me for 30 days
              </span>
            </label>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3 text-base"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Signing in…
                </span>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-5">
            <hr className="flex-1" style={{ borderColor: 'var(--color-border)' }} />
            <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              Don't have an account?
            </span>
            <hr className="flex-1" style={{ borderColor: 'var(--color-border)' }} />
          </div>

          <Link to="/register" className="btn-secondary w-full justify-center py-2.5">
            Create Account
          </Link>
        </div>

        {/* Feature pills */}
        <div className="flex flex-wrap items-center justify-center gap-2 mt-6">
          {FEATURES.map(({ icon: Icon, label }) => (
            <div key={label} className="feature-pill">
              <Icon className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
              <span>{label}</span>
            </div>
          ))}
        </div>

        {/* Footer */}
        <p className="text-center text-xs mt-6" style={{ color: 'var(--color-text-muted)' }}>
          © {new Date().getFullYear()} FinChatBot. All rights reserved.
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
