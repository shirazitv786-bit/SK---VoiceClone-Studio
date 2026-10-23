import React, { useState, useRef, useEffect } from 'react';

export default function Navbar({
  activePage,
  onNavigate,
  serverOnline,
  user,
  onOpenAuth,
  onLogout
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setUserDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const planBadgeColors = {
    Free: 'bg-zinc-100 text-zinc-700 border-zinc-300',
    Basic: 'bg-zinc-100 text-zinc-800 border-zinc-300 font-semibold',
    Silver: 'bg-zinc-200 text-zinc-800 border-zinc-300 font-bold',
    Lite: 'bg-zinc-100 text-zinc-700 border-zinc-300',
    Pro: 'bg-zinc-900 text-white border-zinc-900 font-extrabold',
    Studio: 'bg-zinc-900 text-white border-zinc-900 font-extrabold'
  };

  // Show Studio and Dashboard when logged in, and Admin Console if admin/superadmin
  const navLinks = [
    { id: 'home', label: 'Home' },
    { id: 'voices', label: 'Voices' },
    ...(user ? [{ id: 'studio', label: 'Studio' }] : []),
    { id: 'pricing', label: 'Pricing' },
    ...(user ? [{ id: 'dashboard', label: 'Dashboard' }] : []),
    ...(user && (user.role === 'admin' || user.role === 'superadmin') ? [{ id: 'admin', label: 'Admin' }] : [])
  ];

  return (
    <nav className="sticky top-0 z-40 w-full border-b backdrop-blur-xl px-4 sm:px-6 py-3 transition-colors duration-200 bg-white/95 border-zinc-200/90 text-zinc-900 shadow-sm">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Brand Logo & Name */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate('home')}
            className="flex items-center gap-2.5 text-left group focus:outline-none"
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 bg-gradient-to-tr from-violet-600 via-indigo-600 to-indigo-500 text-white shadow-md shadow-violet-500/25">
              {/* Voice Soundwave Waveform Mark */}
              <svg width="20" height="20" className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <rect x="2" y="9" width="2.5" height="6" rx="1.25" />
                <rect x="6.5" y="5" width="2.5" height="14" rx="1.25" />
                <rect x="11" y="2" width="2.5" height="20" rx="1.25" />
                <rect x="15.5" y="6" width="2.5" height="12" rx="1.25" />
                <rect x="20" y="10" width="2.5" height="4" rx="1.25" />
              </svg>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-base sm:text-lg font-extrabold tracking-tight text-zinc-900">
                SK VoiceClone
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-md bg-violet-100 text-violet-700">
                AI
              </span>
            </div>
          </button>
        </div>

        {/* Center Navigation Links (Clean text without pills; Studio only shown for logged in users) */}
        <div className="hidden md:flex items-center gap-1 lg:gap-2">
          {navLinks.map((link) => {
            const isActive = activePage === link.id;
            return (
              <button
                key={link.id}
                onClick={() => onNavigate(link.id)}
                className={`relative px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                  isActive
                    ? 'bg-zinc-900 text-white font-bold shadow-xs'
                    : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100/80'
                }`}
              >
                {link.label}
              </button>
            );
          })}
        </div>

        {/* Right Action Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Server Connection Status Pill */}
          {serverOnline === false ? (
            <div
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-rose-50 text-rose-600 border border-rose-200"
              title="Backend server offline: Run 'node server.js'"
            >
              <span className="w-2 h-2 rounded-full bg-rose-500"></span>
              <span className="hidden xl:inline">Engine Offline</span>
            </div>
          ) : (
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border bg-zinc-50 text-zinc-700 border-zinc-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="hidden xl:inline">120 Voices Ready</span>
            </div>
          )}

          {/* Authentication State */}
          {user ? (
            /* Logged In User State */
            <div className="relative" ref={dropdownRef}>
              <div className="flex items-center gap-2">
                {/* Credits Pill (Clickable -> Opens Pricing) */}
                <button
                  onClick={() => onNavigate('pricing')}
                  className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all bg-indigo-50/80 border-indigo-200/90 text-indigo-950 hover:bg-indigo-100 hover:border-indigo-300 shadow-xs"
                  title="View your credit allocation or upgrade packages"
                >
                  <span className="text-indigo-600 font-bold">⚡</span>
                  <span className="font-mono font-extrabold">{user.credits?.toLocaleString() || '2,000'}</span>
                  <span className="hidden xl:inline text-[11px] font-medium text-indigo-600/80">credits</span>
                </button>

                {/* User Avatar & Dropdown Trigger */}
                <button
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center gap-2 p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl border transition-all border-zinc-200 bg-zinc-100 text-zinc-800 hover:bg-zinc-200/80 shadow-sm"
                >
                  <div className="w-6 h-6 rounded-lg bg-zinc-900 text-white font-extrabold text-xs flex items-center justify-center shrink-0 uppercase">
                    {user.name ? user.name[0] : 'U'}
                  </div>
                  <span className="hidden md:inline text-xs font-semibold max-w-[100px] truncate text-zinc-900">
                    {user.name || 'Creator'}
                  </span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded border uppercase font-mono font-bold ${planBadgeColors[user.plan] || planBadgeColors.Free}`}>
                    {user.plan || 'Free'}
                  </span>
                  <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>

              {/* User Dropdown Menu */}
              {userDropdownOpen && (
                <div className="absolute right-0 mt-2 w-64 rounded-2xl border p-2 shadow-xl z-50 animate-fadeIn bg-white border-zinc-200 text-zinc-800">
                  <div className="px-3 py-2.5 border-b border-zinc-100 mb-1">
                    <p className="text-xs font-bold truncate text-zinc-900">{user.name || 'Studio Creator'}</p>
                    <p className="text-[11px] text-zinc-500 truncate">{user.email || 'user@voiceclone.ai'}</p>
                    <div className="mt-2 flex items-center justify-between text-xs">
                      <span className="text-zinc-500">Current Plan:</span>
                      <span className="font-bold text-zinc-900">{user.plan || 'Free Plan'}</span>
                    </div>
                    <div className="mt-1 flex items-center justify-between text-xs">
                      <span className="text-zinc-500">Credits Remaining:</span>
                      <span className="font-mono font-bold text-zinc-900">⚡ {user.credits?.toLocaleString() || '2,000'}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setUserDropdownOpen(false);
                      onNavigate('dashboard');
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl text-xs font-medium flex items-center gap-2 transition-colors hover:bg-zinc-100 text-zinc-700 hover:text-zinc-900"
                  >
                    <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h7" />
                    </svg>
                    <span>User Dashboard</span>
                  </button>

                  <button
                    onClick={() => {
                      setUserDropdownOpen(false);
                      onNavigate('studio');
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl text-xs font-medium flex items-center gap-2 transition-colors hover:bg-zinc-100 text-zinc-700 hover:text-zinc-900"
                  >
                    <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 100-6 3 3 0 000 6z" />
                    </svg>
                    <span>Open Voice Studio</span>
                  </button>

                  {(user.role === 'admin' || user.role === 'superadmin') && (
                    <button
                      onClick={() => {
                        setUserDropdownOpen(false);
                        onNavigate('admin');
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors hover:bg-zinc-100 text-zinc-900"
                    >
                      <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                      <span>Admin Console</span>
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setUserDropdownOpen(false);
                      onNavigate('pricing');
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl text-xs font-medium flex items-center gap-2 transition-colors hover:bg-zinc-100 text-zinc-700 hover:text-zinc-900"
                  >
                    <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <span>Upgrade Packages</span>
                  </button>

                  <div className="border-t border-zinc-100 my-1"></div>

                  <button
                    onClick={() => {
                      setUserDropdownOpen(false);
                      onLogout();
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 flex items-center gap-2 transition-colors hover:bg-rose-50"
                  >
                    <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* Logged Out: Clean Sign In & Try Free Buttons Matching UI Design */
            <div className="flex items-center gap-2">
              <button
                onClick={() => onOpenAuth('login')}
                className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all text-zinc-800 hover:text-zinc-950 bg-white border border-zinc-200/90 hover:border-zinc-300 shadow-2xs active:scale-95"
              >
                Sign In
              </button>
              <button
                onClick={() => onOpenAuth('signup')}
                className="hidden sm:flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all transform active:scale-95 bg-violet-600 hover:bg-violet-700 text-white shadow-sm shadow-violet-500/20"
              >
                <span>Try for Free</span>
              </button>
            </div>
          )}

          {/* Mobile Hamburger Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-xl border transition-all border-zinc-200 bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
            aria-label="Open mobile menu"
          >
            {mobileMenuOpen ? (
              <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Navigation */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t mt-3 pt-3 pb-2 space-y-1 animate-fadeIn border-zinc-200 bg-white">
          {navLinks.map((link) => (
            <button
              key={link.id}
              onClick={() => {
                setMobileMenuOpen(false);
                onNavigate(link.id);
              }}
              className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-between ${
                activePage === link.id
                  ? 'bg-zinc-900 text-white font-bold'
                  : 'text-zinc-600 hover:bg-zinc-100'
              }`}
            >
              <span>{link.label}</span>
            </button>
          ))}

          {/* Mobile Auth actions if logged out */}
          {!user && (
            <div className="pt-2 border-t border-zinc-200 grid grid-cols-2 gap-2 px-2">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenAuth('login');
                }}
                className="py-2 rounded-xl text-xs font-bold border text-center border-zinc-300 text-zinc-800 hover:bg-zinc-100"
              >
                Log In
              </button>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenAuth('signup');
                }}
                className="py-2 rounded-xl text-xs font-bold bg-violet-600 hover:bg-violet-700 text-white text-center shadow-sm shadow-violet-500/20"
              >
                Sign Up Free
              </button>
            </div>
          )}
        </div>
      )}
    </nav>
  );
}
