/**
 * Forgot Password Page
 * Request password reset email — fully themed, light/dark aware.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Bot, Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import ThemeToggle from '../components/ThemeToggle';

const ForgotPasswordPage = () => {
  const { forgotPassword } = useAuth();
  const [email, setEmail]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const result = await forgotPassword({ email });
    if (result.success) setSubmitted(true);
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

  return (
    <div style={pageStyle}>
      {/* Theme toggle */}
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md">
        {submitted ? (
          /* ---- Success state ---- */
          <>
            <div className="text-center mb-8">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center shadow-xl">
                <CheckCircle className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-3xl font-bold mb-1.5" style={{ color: 'var(--color-text-primary)' }}>
                Check Your Email
              </h1>
              <p style={{ color: 'var(--color-text-secondary)' }}>
                Reset instructions sent to <strong style={{ color: 'var(--color-text-primary)' }}>{email}</strong>
              </p>
            </div>

            <div className="card p-8 text-center space-y-4">
              <p style={{ color: 'var(--color-text-secondary)' }}>
                Didn't receive the email? Check your spam folder or try again.
              </p>
              <button
                onClick={() => setSubmitted(false)}
                className="btn-secondary"
              >
                Try another email
              </button>
              <div className="pt-4 border-t" style={{ borderColor: 'var(--color-border)' }}>
                <Link
                  to="/login"
                  className="flex items-center justify-center gap-2 text-sm font-medium transition-colors"
                  style={{ color: 'var(--color-text-secondary)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-text-primary)')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-text-secondary)')}
                >
                  <ArrowLeft className="w-4 h-4" /> Back to login
                </Link>
              </div>
            </div>
          </>
        ) : (
          /* ---- Form state ---- */
          <>
            <div className="text-center mb-8">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center shadow-xl">
                <Bot className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-3xl font-bold mb-1.5" style={{ color: 'var(--color-text-primary)' }}>
                Forgot Password?
              </h1>
              <p style={{ color: 'var(--color-text-secondary)' }}>
                No worries — we'll send you reset instructions
              </p>
            </div>

            <div className="card p-8">
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)', width: '1.1rem', height: '1.1rem' }} />
                    <input
                      id="email"
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="input-field pl-10"
                      placeholder="you@example.com"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full py-3 text-base"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Sending…
                    </span>
                  ) : (
                    'Send Reset Link'
                  )}
                </button>
              </form>

              <div className="mt-6 pt-6 border-t" style={{ borderColor: 'var(--color-border)' }}>
                <Link
                  to="/login"
                  className="flex items-center justify-center gap-2 text-sm font-medium transition-colors"
                  style={{ color: 'var(--color-text-secondary)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-text-primary)')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-text-secondary)')}
                >
                  <ArrowLeft className="w-4 h-4" /> Back to login
                </Link>
              </div>
            </div>
          </>
        )}

        <p className="text-center text-xs mt-8" style={{ color: 'var(--color-text-muted)' }}>
          © {new Date().getFullYear()} FinChatBot. All rights reserved.
        </p>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
