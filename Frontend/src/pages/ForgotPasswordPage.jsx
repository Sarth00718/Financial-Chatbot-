/**
 * Forgot Password Page
 * Request password reset — premium themed, fully light/dark aware.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { BarChart3, Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import ThemeToggle from '../components/ThemeToggle';

const ForgotPasswordPage = () => {
  const { forgotPassword } = useAuth();
  const [email, setEmail]         = useState('');
  const [loading, setLoading]     = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const result = await forgotPassword({ email });
    if (result.success) setSubmitted(true);
    setLoading(false);
  };

  return (
    <div className="page-auth">
      <div className="absolute top-4 right-4 z-20"><ThemeToggle /></div>

      {/* Decorative blob */}
      <div
        className="absolute top-[-10%] left-[-8%] w-80 h-80 rounded-full animate-blob opacity-35 pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(37,99,235,0.3) 0%, transparent 70%)' }}
      />

      <div className="relative z-10 w-full max-w-md animate-fadeInUp">
        {submitted ? (
          <>
            <div className="text-center mb-8">
              <div
                className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center shadow-xl"
                style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)' }}
              >
                <CheckCircle className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-3xl font-bold mb-1.5" style={{ color: 'var(--color-text-primary)' }}>
                Check Your Email
              </h1>
              <p style={{ color: 'var(--color-text-secondary)' }}>
                Reset instructions sent to{' '}
                <strong style={{ color: 'var(--color-text-primary)' }}>{email}</strong>
              </p>
            </div>

            <div className="auth-card text-center space-y-4">
              <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                Didn't receive the email? Check your spam folder or try again.
              </p>
              <button onClick={() => setSubmitted(false)} className="btn-secondary">
                Try another email
              </button>
              <div className="pt-4 border-t" style={{ borderColor: 'var(--color-border)' }}>
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" /> Back to login
                </Link>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="text-center mb-8">
              <div className="brand-icon mx-auto mb-4">
                <BarChart3 className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-3xl font-bold mb-1.5" style={{ color: 'var(--color-text-primary)' }}>
                Forgot Password?
              </h1>
              <p style={{ color: 'var(--color-text-secondary)' }}>
                No worries — we'll send you reset instructions
              </p>
            </div>

            <div className="auth-card">
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label htmlFor="email" className="block text-sm font-semibold mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--color-text-muted)' }} />
                    <input
                      id="email"
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="input-field pl-10"
                      placeholder="you@example.com"
                    />
                  </div>
                </div>

                <button type="submit" disabled={loading} className="btn-primary w-full py-3 text-base">
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Sending…
                    </span>
                  ) : 'Send Reset Link'}
                </button>
              </form>

              <div className="mt-6 pt-6 border-t" style={{ borderColor: 'var(--color-border)' }}>
                <Link
                  to="/login"
                  className="flex items-center justify-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" /> Back to login
                </Link>
              </div>
            </div>
          </>
        )}

        <p className="text-center text-xs mt-6" style={{ color: 'var(--color-text-muted)' }}>
          © {new Date().getFullYear()} FinChatBot. All rights reserved.
        </p>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
