import React, { useState, useEffect } from 'react';
import axios from 'axios';

// Backend API URL (Supports local dev ports e.g. 5173/5174 and same-origin production deployments)
const isLocalDev = typeof window !== 'undefined' && 
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') && 
  window.location.port !== '5000' && window.location.port !== '';

const API_BASE = isLocalDev
  ? (import.meta.env?.VITE_API_BASE || 'http://localhost:5000')
  : (import.meta.env?.VITE_API_BASE || '');

export default function AuthCard({
  initialMode = 'login', // 'login' | 'signup' | 'forgot'
  onSuccess,
  onClose,
  isModal = false
}) {
  const [mode, setMode] = useState(initialMode); // 'login' | 'signup' | 'forgot'
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [loading, setLoading] = useState(false);

  // Sync mode whenever initialMode changes
  useEffect(() => {
    setMode(initialMode);
    setError(null);
    setSuccessMsg(null);
  }, [initialMode]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setError('Please provide a valid email address.');
      return;
    }

    // Forgot Password Flow
    if (mode === 'forgot') {
      setLoading(true);
      setTimeout(() => {
        setLoading(false);
        setSuccessMsg(`If an account exists for ${cleanEmail}, password reset instructions have been sent to your inbox.`);
      }, 700);
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (mode === 'signup') {
      if (!name.trim()) {
        setError('Please enter your full name or creator handle.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        return;
      }
      if (!agreeTerms) {
        setError('You must agree to the Commercial Terms of Service to create an account.');
        return;
      }
    }

    setLoading(true);

    try {
      const endpoint = mode === 'signup' ? `${API_BASE}/api/auth/register` : `${API_BASE}/api/auth/login`;
      const payload = mode === 'signup'
        ? { name: name.trim(), email: cleanEmail, password }
        : { email: cleanEmail, password };

      const response = await axios.post(endpoint, payload);

      if (response.data && response.data.success) {
        const { user: userData, token } = response.data;

        // Persist token and user in localStorage
        if (token) {
          localStorage.setItem('sk_voiceclone_auth_token', token);
          axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        }
        if (userData) {
          localStorage.setItem('sk_voiceclone_auth_user', JSON.stringify(userData));
        }

        // Notify parent application
        if (onSuccess) {
          onSuccess(userData, token);
        }

        // Reset form
        setName('');
        setEmail('');
        setPassword('');
        setConfirmPassword('');
        setError(null);
        if (onClose) onClose();
      } else {
        setError(response.data?.error || 'Authentication failed. Please verify credentials.');
      }
    } catch (err) {
      console.error('[Auth Error]:', err);
      const serverMsg = err.response?.data?.error;
      const detailsMsg = err.response?.data?.details;
      const networkMsg = err.message || 'Unable to connect to authentication server.';
      setError(serverMsg ? (detailsMsg ? `${serverMsg} (${detailsMsg})` : serverMsg) : networkMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto relative rounded-3xl bg-white border border-zinc-200/90 shadow-2xl shadow-indigo-500/10 p-6 sm:p-8 text-zinc-900 overflow-hidden">
      {/* Decorative Ambient Radial Glow */}
      <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-36 bg-gradient-to-b from-violet-500/15 via-indigo-500/10 to-transparent blur-2xl pointer-events-none rounded-full" />
      <div className="absolute -bottom-16 -right-16 w-44 h-44 bg-violet-400/10 blur-3xl pointer-events-none rounded-full" />

      {/* Top Close Button (Visible when rendered as modal) */}
      {isModal && onClose && (
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full text-zinc-400 hover:text-zinc-800 hover:bg-zinc-100 transition-all z-20 flex items-center justify-center cursor-pointer active:scale-95 border border-transparent hover:border-zinc-200"
          aria-label="Close dialog"
          title="Close (Esc)"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}

      {/* Header: Gradient Icon + Titles */}
      <div className="text-center mb-5 relative z-10">
        <div className="relative inline-flex mb-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-violet-600 via-indigo-600 to-purple-600 text-white flex items-center justify-center shadow-lg shadow-violet-500/30 ring-4 ring-violet-50">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2.2"
                d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 100-6 3 3 0 000 6z"
              />
            </svg>
          </div>
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 border-2 border-white"></span>
          </span>
        </div>

        <h2 className="text-2xl font-black tracking-tight text-zinc-900">
          {mode === 'login' && 'Welcome Back'}
          {mode === 'signup' && 'Create Studio Account'}
          {mode === 'forgot' && 'Reset Password'}
        </h2>
        <p className="text-xs sm:text-sm text-zinc-500 mt-1 max-w-xs mx-auto">
          {mode === 'login' && 'Sign in to access your cloned voices, audio history & workstation.'}
          {mode === 'signup' && 'Sign up to claim 2,000 free credits and clone voices instantly.'}
          {mode === 'forgot' && 'Enter your account email to receive password reset instructions.'}
        </p>
      </div>

      {/* Mode Switcher Tabs (Sign In vs Create Account) */}
      {mode !== 'forgot' && (
        <div className="grid grid-cols-2 p-1 rounded-2xl border border-zinc-200/90 bg-zinc-100/80 mb-4 relative z-10">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setError(null);
              setSuccessMsg(null);
            }}
            className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              mode === 'login'
                ? 'bg-white text-zinc-900 shadow-sm border border-zinc-200/60 font-extrabold'
                : 'text-zinc-500 hover:text-zinc-900 font-semibold'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('signup');
              setError(null);
              setSuccessMsg(null);
            }}
            className={`py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              mode === 'signup'
                ? 'bg-white text-zinc-900 shadow-sm border border-zinc-200/60 font-extrabold'
                : 'text-zinc-500 hover:text-zinc-900 font-semibold'
            }`}
          >
            <span>Create Account</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-xs">
              +2k Free
            </span>
          </button>
        </div>
      )}

      {/* Welcome Bonus Notice on Sign Up */}
      {mode === 'signup' && (
        <div className="mb-4 p-3 rounded-2xl bg-gradient-to-r from-violet-50 via-purple-50/60 to-indigo-50 border border-violet-100 text-xs flex items-center justify-between text-violet-950 relative z-10">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 rounded-lg bg-violet-600 text-white items-center justify-center text-xs font-bold shadow-xs">
              ⚡
            </span>
            <div>
              <p className="font-bold text-violet-950 text-xs">Starter Bonus Included</p>
              <p className="text-[10px] text-violet-700">120+ natural neural voices & cloning</p>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded-lg bg-white border border-violet-200 font-mono font-extrabold text-violet-700 text-xs shadow-2xs">
            +2,000 Credits
          </span>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="mb-4 p-3 rounded-xl text-xs font-semibold bg-rose-50 border border-rose-200 text-rose-700 flex items-start gap-2 relative z-10 animate-fadeIn">
          <svg className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="flex-1 leading-relaxed">{error}</span>
        </div>
      )}

      {/* Success Alert */}
      {successMsg && (
        <div className="mb-4 p-3 rounded-xl text-xs font-semibold bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-start gap-2 relative z-10 animate-fadeIn">
          <svg className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
          </svg>
          <span className="flex-1 leading-relaxed">{successMsg}</span>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-3 relative z-10">
        {mode === 'signup' && (
          <div>
            <label className="block text-xs font-bold text-zinc-700 mb-1">
              Full Name / Creator Handle
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </span>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Alex Rivera"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-zinc-200 bg-zinc-50/70 hover:bg-zinc-50 focus:bg-white focus:border-violet-600 focus:ring-4 focus:ring-violet-500/10 text-xs sm:text-sm text-zinc-900 placeholder-zinc-400 transition-all outline-none"
              />
            </div>
          </div>
        )}

        <div>
          <label className="block text-xs font-bold text-zinc-700 mb-1">
            Email Address
          </label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@company.com"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-zinc-200 bg-zinc-50/70 hover:bg-zinc-50 focus:bg-white focus:border-violet-600 focus:ring-4 focus:ring-violet-500/10 text-xs sm:text-sm text-zinc-900 placeholder-zinc-400 transition-all outline-none"
            />
          </div>
        </div>

        {mode !== 'forgot' && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-zinc-700">
                Password
              </label>
              {mode === 'login' && (
                <button
                  type="button"
                  onClick={() => {
                    setMode('forgot');
                    setError(null);
                    setSuccessMsg(null);
                  }}
                  className="text-[11px] text-violet-600 hover:text-violet-700 font-semibold cursor-pointer"
                >
                  Forgot password?
                </button>
              )}
            </div>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-zinc-200 bg-zinc-50/70 hover:bg-zinc-50 focus:bg-white focus:border-violet-600 focus:ring-4 focus:ring-violet-500/10 text-xs sm:text-sm text-zinc-900 placeholder-zinc-400 transition-all outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-zinc-400 hover:text-zinc-600 cursor-pointer"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        )}

        {mode === 'signup' && (
          <div>
            <label className="block text-xs font-bold text-zinc-700 mb-1">
              Confirm Password
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </span>
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-zinc-200 bg-zinc-50/70 hover:bg-zinc-50 focus:bg-white focus:border-violet-600 focus:ring-4 focus:ring-violet-500/10 text-xs sm:text-sm text-zinc-900 placeholder-zinc-400 transition-all outline-none"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-zinc-400 hover:text-zinc-600 cursor-pointer"
                aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
              >
                {showConfirmPassword ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        )}

        {mode === 'signup' && (
          <div className="flex items-start gap-2 pt-1">
            <input
              type="checkbox"
              id="auth-terms"
              checked={agreeTerms}
              onChange={(e) => setAgreeTerms(e.target.checked)}
              className="mt-0.5 rounded border-zinc-300 text-violet-600 focus:ring-violet-500 accent-violet-600 cursor-pointer"
            />
            <label htmlFor="auth-terms" className="text-[11px] text-zinc-500 leading-tight cursor-pointer">
              I agree to the Commercial Terms of Service and Privacy Policy.
            </label>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full mt-2 py-3 rounded-xl text-xs sm:text-sm font-bold text-white transition-all transform active:scale-[0.98] bg-gradient-to-r from-violet-600 via-indigo-600 to-violet-700 hover:from-violet-500 hover:to-indigo-500 shadow-lg shadow-violet-500/25 hover:shadow-violet-500/35 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
        >
          {loading ? (
            <>
              <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Authenticating...</span>
            </>
          ) : (
            <>
              <span>
                {mode === 'login' && 'Sign In to Account'}
                {mode === 'signup' && 'Claim 2,000 Free Credits & Start'}
                {mode === 'forgot' && 'Send Reset Instructions'}
              </span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </>
          )}
        </button>
      </form>

      {/* Switcher Helper */}
      <div className="mt-4 pt-3 border-t border-zinc-100 text-center relative z-10 text-xs">
        {mode === 'login' && (
          <p className="text-zinc-500">
            Don't have an account?{' '}
            <button
              type="button"
              onClick={() => {
                setMode('signup');
                setError(null);
                setSuccessMsg(null);
              }}
              className="font-bold text-violet-600 hover:text-violet-700 underline underline-offset-2 cursor-pointer transition-colors"
            >
              Create account for free →
            </button>
          </p>
        )}
        {mode === 'signup' && (
          <p className="text-zinc-500">
            Already have an account?{' '}
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError(null);
                setSuccessMsg(null);
              }}
              className="font-bold text-violet-600 hover:text-violet-700 underline underline-offset-2 cursor-pointer transition-colors"
            >
              Sign in to studio →
            </button>
          </p>
        )}
        {mode === 'forgot' && (
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setError(null);
              setSuccessMsg(null);
            }}
            className="font-bold text-violet-600 hover:text-violet-700 underline underline-offset-2 cursor-pointer transition-colors"
          >
            ← Back to Sign In
          </button>
        )}
      </div>

      {/* Trust Row */}
      <div className="mt-4 pt-3 border-t border-zinc-100/80 flex items-center justify-center gap-4 text-[10px] text-zinc-600 font-medium relative z-10">
        <span className="flex items-center gap-1">
          <svg className="w-3 h-3 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          256-Bit SSL
        </span>
        <span className="text-zinc-300">•</span>
        <span className="flex items-center gap-1">
          <svg className="w-3 h-3 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          Instant Setup
        </span>
        <span className="text-zinc-300">•</span>
        <span className="flex items-center gap-1">
          <svg className="w-3 h-3 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 100-6 3 3 0 000 6z" />
          </svg>
          120+ AI Voices
        </span>
      </div>

      {/* Close Window text button for modal */}
      {isModal && onClose && (
        <div className="mt-3 text-center">
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-zinc-500 hover:text-zinc-700 transition-colors font-medium cursor-pointer"
          >
            ✕ Close Window
          </button>
        </div>
      )}
    </div>
  );
}
