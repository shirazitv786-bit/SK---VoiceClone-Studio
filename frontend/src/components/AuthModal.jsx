import React, { useState, useEffect } from 'react';
import axios from 'axios';

// Backend API URL (Supports local dev port 5173 and production deployment)
const API_BASE = typeof window !== 'undefined' && window.location.port === '5173'
  ? (import.meta.env?.VITE_API_BASE || 'http://localhost:5000')
  : (import.meta.env?.VITE_API_BASE || '');

export default function AuthModal({
  isOpen,
  initialMode = 'login', // 'login' | 'signup'
  onClose,
  onLoginSuccess
}) {
  const [mode, setMode] = useState(initialMode); // 'login' or 'signup'
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(true);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  // Synchronize mode when initialMode prop changes
  useEffect(() => {
    setMode(initialMode);
    setError(null);
  }, [initialMode, isOpen]);

  // Close on Escape key press
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setError('Please provide a valid email address.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
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
        if (onLoginSuccess) {
          onLoginSuccess(userData, token);
        }

        // Clear input form
        setName('');
        setEmail('');
        setPassword('');
        setConfirmPassword('');
        setError(null);
        onClose();
      } else {
        setError(response.data?.error || 'Authentication failed. Please verify credentials.');
      }
    } catch (err) {
      console.error('[Auth Error]:', err);
      const serverMsg = err.response?.data?.error;
      const networkMsg = err.message || 'Unable to connect to authentication server.';
      setError(serverMsg || networkMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-sm sm:max-w-md my-auto rounded-2xl sm:rounded-3xl border p-4 sm:p-6 shadow-2xl relative transition-all bg-[#121215] border-zinc-800 text-zinc-100 max-h-[92vh] overflow-y-auto">
        {/* Top-Right Close Button (Prominent & Accessible) */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3.5 right-3.5 sm:top-4 sm:right-4 p-2 rounded-xl text-zinc-400 hover:text-white bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-700/80 transition-all z-20 flex items-center justify-center cursor-pointer shadow-sm active:scale-95"
          aria-label="Close dialog"
          title="Close (Esc)"
        >
          <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Modal Header (Compact & Centered) */}
        <div className="text-center mb-3.5 pr-8 pl-8">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl mx-auto flex items-center justify-center mb-2 bg-white text-black shadow-md shadow-white/5">
            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2.5"
                d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 100-6 3 3 0 000 6z"
              />
            </svg>
          </div>
          <h2 className="text-lg sm:text-xl font-extrabold tracking-tight text-white leading-tight">
            {mode === 'login' ? 'Welcome Back to Studio' : 'Create Your Studio Account'}
          </h2>
          <p className="text-[11px] sm:text-xs mt-0.5 text-zinc-400">
            {mode === 'login'
              ? 'Sign in to access your cloned voices, history, and studio.'
              : 'Sign up to receive 2,000 Free Credits to synthesize immediately!'}
          </p>
        </div>

        {/* Mode Tabs (Sign In vs Sign Up) */}
        <div className="flex p-1 rounded-xl border border-zinc-800 bg-zinc-900/90 mb-3">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setError(null);
            }}
            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
              mode === 'login'
                ? 'bg-white text-black shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('signup');
              setError(null);
            }}
            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              mode === 'signup'
                ? 'bg-white text-black shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <span>Create Account</span>
            <span className={`text-[10px] px-1 py-0.2 rounded font-mono font-bold ${
              mode === 'signup' ? 'bg-black text-white' : 'bg-zinc-800 text-zinc-300'
            }`}>
              +2k
            </span>
          </button>
        </div>

        {/* Compact Welcome Bonus Notice on Sign Up */}
        {mode === 'signup' && (
          <div className="mb-3 px-3 py-1.5 rounded-xl bg-zinc-900/90 border border-zinc-800 text-[11px] flex items-center justify-between text-zinc-300">
            <span className="flex items-center gap-1.5 font-medium">
              <span className="text-white">⚡</span> Starter Allotment
            </span>
            <span className="font-mono font-bold text-white bg-zinc-800 px-2 py-0.5 rounded border border-zinc-700">
              +2,000 Free Credits
            </span>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="mb-3 p-2.5 rounded-xl text-xs font-semibold bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center gap-2">
            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {/* Auth Form */}
        <form onSubmit={handleSubmit} className="space-y-2.5">
          {mode === 'signup' && (
            <div>
              <label className="block text-[11px] font-bold text-zinc-300 mb-1">
                Full Name / Creator Handle
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Alex Rivera"
                className="w-full px-3.5 py-2 rounded-xl border text-xs focus:outline-none transition-all bg-zinc-900 border-zinc-700/80 text-white placeholder-zinc-500 focus:border-zinc-400"
              />
            </div>
          )}

          <div>
            <label className="block text-[11px] font-bold text-zinc-300 mb-1">
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@company.com"
              className="w-full px-3.5 py-2 rounded-xl border text-xs focus:outline-none transition-all bg-zinc-900 border-zinc-700/80 text-white placeholder-zinc-500 focus:border-zinc-400"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[11px] font-bold text-zinc-300">
                Password
              </label>
              {mode === 'login' && (
                <span className="text-[10px] text-zinc-500 hover:text-zinc-300 cursor-pointer">
                  Forgot password?
                </span>
              )}
            </div>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3.5 py-2 rounded-xl border text-xs focus:outline-none transition-all bg-zinc-900 border-zinc-700/80 text-white placeholder-zinc-500 focus:border-zinc-400"
            />
          </div>

          {mode === 'signup' && (
            <div>
              <label className="block text-[11px] font-bold text-zinc-300 mb-1">
                Confirm Password
              </label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2 rounded-xl border text-xs focus:outline-none transition-all bg-zinc-900 border-zinc-700/80 text-white placeholder-zinc-500 focus:border-zinc-400"
              />
            </div>
          )}

          {mode === 'signup' && (
            <div className="flex items-start gap-2 pt-0.5">
              <input
                type="checkbox"
                id="terms"
                checked={agreeTerms}
                onChange={(e) => setAgreeTerms(e.target.checked)}
                className="mt-0.5 rounded text-white focus:ring-zinc-500 bg-zinc-900 border-zinc-700"
              />
              <label htmlFor="terms" className="text-[10px] text-zinc-400 leading-tight">
                I agree to the Commercial Terms of Service and Privacy Policy.
              </label>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-1.5 py-2.5 rounded-xl text-xs font-bold transition-all bg-white hover:bg-zinc-200 text-black shadow-md shadow-white/5 flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-4 w-4 text-black" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Processing...</span>
              </>
            ) : (
              <span>{mode === 'login' ? 'Sign In to Account' : 'Claim 2,000 Free Credits'}</span>
            )}
          </button>
        </form>

        {/* Bottom Close Action */}
        <div className="mt-3 text-center">
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors font-medium cursor-pointer"
          >
            ✕ Close Window
          </button>
        </div>
      </div>
    </div>
  );
}
