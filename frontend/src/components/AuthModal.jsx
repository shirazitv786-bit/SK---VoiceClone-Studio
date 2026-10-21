import React, { useEffect } from 'react';
import AuthCard from './AuthCard';

export default function AuthModal({
  isOpen,
  initialMode = 'login', // 'login' | 'signup' | 'forgot'
  onClose,
  onLoginSuccess
}) {
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

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-zinc-950/60 backdrop-blur-md overflow-y-auto animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-md my-auto relative">
        <AuthCard
          initialMode={initialMode}
          onSuccess={onLoginSuccess}
          onClose={onClose}
          isModal={true}
        />
      </div>
    </div>
  );
}
