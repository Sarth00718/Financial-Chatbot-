/**
 * Login Page
 * User authentication — fully themed, light/dark aware.
 */

import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Bot, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import ThemeToggle from '../components/ThemeToggle';

const LoginPage = () => {
  const navigate  = useNavigate();
  const { login, isAuthenticated } = useAuth();

  const [formData, setFormData]     = useState({ email: '', password: '' });
  const [showPassword, setShowPwd]  = useState(false);
  const [loading, setLoading]       = useState(false);

  useEffect(() => {
    if (isAuthenticated) navigate('/');
  }, [isAuthenticated, navigate]);

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const result = await login(formData);
    if (result.success) navigate('/');
    setLoading(false);
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-10 relative"
      style={{ backgroundColor: 'var(--color-bg-page)', transition: 'background-color 0.25s ease' }}
    >
      {/* Theme toggle — top right */}
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md">
        {/* ---- Logo ---- */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center shadow-xl">
            <Bot className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold mb-1.5" style={{ color: 'var(--color-text-primary)' }}>
            Welcome Back
          </h1>
          <p style={{ color: 'var(--color-text-secondary)' }}>
            Sign in to your FinChatBot account
          </p>
        </div>

        {/* ---- Form card ---- */}
        <div className="card p-8">
          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                Email Address
              </label>
              <div className="relative">
                <Mail
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5"
                  style={{ color: 'var(--color-text-muted)', width: '1.1rem', height: '1.1rem' }}
                />
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="input-field pl-10"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                Password
              </label>
              <div className="relative">
                <Lock
                  className="absolute left-3 top-1/2 -translate-y-1/2"
                  style={{ color: 'var(--color-text-muted)', width: '1.1rem', height: '1.1rem' }}
                />
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  className="input-field pl-10 pr-11"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 icon-btn p-0"
                  aria-label="Toggle password visibility"
                >
                  {showPassword
                    ? <EyeOff style={{ width: '1.1rem', height: '1.1rem' }} />
                    : <Eye  style={{ width: '1.1rem', height: '1.1rem' }} />}
                </button>
              </div>
            </div>

            {/* Remember + Forgot */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  id="remember"
                  type="checkbox"
                  className="w-4 h-4 rounded accent-blue-600"
                  style={{ borderColor: 'var(--color-border-input)' }}
                />
                <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                  Remember me
                </span>
              </label>
              <Link
                to="/forgot-password"
                className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
              >
                Forgot password?
              </Link>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3 text-base mt-2"
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

          {/* Register link */}
          <p className="mt-6 text-center text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            Don't have an account?{' '}
            <Link to="/register" className="font-semibold text-blue-600 hover:text-blue-700 transition-colors">
              Sign up
            </Link>
          </p>
        </div>

        {/* Footer */}
        <p className="text-center text-xs mt-8" style={{ color: 'var(--color-text-muted)' }}>
          © {new Date().getFullYear()} FinChatBot. All rights reserved.
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
