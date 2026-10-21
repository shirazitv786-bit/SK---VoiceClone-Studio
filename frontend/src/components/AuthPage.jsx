import React, { useEffect } from 'react';
import AuthCard from './AuthCard';

export default function AuthPage({
  initialMode = 'login',
  onNavigate,
  onLoginSuccess
}) {
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [initialMode]);

  return (
    <div className="min-h-[calc(100vh-140px)] w-full py-10 sm:py-16 px-4 flex flex-col items-center justify-center relative overflow-hidden bg-[#f8fafc]">
      {/* Background Ambient Glow & Geometric Elements */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-gradient-to-tr from-violet-400/15 via-indigo-300/10 to-transparent rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 -left-20 w-80 h-80 bg-purple-300/10 rounded-full blur-3xl pointer-events-none" />

      {/* Back to Home Quick Navigation */}
      <div className="w-full max-w-md mb-4 flex items-center justify-between text-xs text-zinc-500 relative z-10 px-1">
        <button
          type="button"
          onClick={() => onNavigate('home')}
          className="flex items-center gap-1.5 font-semibold text-zinc-600 hover:text-zinc-900 transition-colors cursor-pointer group"
        >
          <span className="transition-transform group-hover:-translate-x-0.5">←</span>
          <span>Back to Home</span>
        </button>

        <span className="text-[11px] font-mono text-zinc-400">
          SK - VoiceClone Studio
        </span>
      </div>

      {/* Center Auth Card */}
      <div className="w-full max-w-md relative z-10 animate-fadeIn">
        <AuthCard
          initialMode={initialMode}
          onSuccess={onLoginSuccess}
          isModal={false}
        />
      </div>

      {/* Footer Branding Note */}
      <div className="mt-8 text-center text-xs text-zinc-400 relative z-10">
        <p>
          Need enterprise neural voice training?{' '}
          <button
            type="button"
            onClick={() => onNavigate('pricing')}
            className="font-bold text-violet-600 hover:text-violet-700 underline underline-offset-2 cursor-pointer ml-1"
          >
            Explore Enterprise & Pricing Plans →
          </button>
        </p>
      </div>
    </div>
  );
}
