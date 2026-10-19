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
    Free: 'bg-zinc-800 text-zinc-300 border-zinc-700',
    Lite: 'bg-zinc-800 text-zinc-200 border-zinc-700',
    Pro: 'bg-white text-black border-white font-extrabold',
    Studio: 'bg-zinc-100 text-black border-zinc-300 font-extrabold'
  };

  // Show Studio and Dashboard when logged in, and Admin Console if admin/superadmin
  const navLinks = [
    { id: 'home', label: 'Home' },
    ...(user ? [{ id: 'studio', label: 'Studio' }] : []),
    { id: 'pricing', label: 'Pricing' },
    ...(user ? [{ id: 'dashboard', label: 'Dashboard' }] : []),
    ...(user && (user.role === 'admin' || user.role === 'superadmin') ? [{ id: 'admin', label: 'Admin' }] : [])
  ];

  return (
    <nav className="sticky top-0 z-40 w-full border-b backdrop-blur-xl px-4 sm:px-6 py-3 transition-colors duration-200 bg-[#09090b]/95 border-zinc-800/80 text-white">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Brand Logo & Name */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate('home')}
            className="flex items-center gap-2.5 text-left group focus:outline-none"
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 bg-white text-black shadow-md shadow-white/5">
              <svg width="20" height="20" className="w-5 h-5 fill-none stroke-current" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2.5"
                  d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 100-6 3 3 0 000 6z"
                />
              </svg>
            </div>
            <div>
              <span className="text-base sm:text-lg font-extrabold tracking-tight leading-none text-white block">
                SK - VoiceClone Studio
              </span>
              <p className="text-[11px] text-zinc-400 mt-0.5 hidden sm:block font-medium">
                Commercial Speech & Neural Cloning Suite
              </p>
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
                    ? 'bg-white text-black font-bold shadow-sm'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
                }`}
              >
                {link.label}
              </button>
            );
          })}

          {/* Voices Link without pill */}
          <button
            onClick={() => onNavigate('home', '#voices')}
            className="px-4 py-2 rounded-xl text-sm font-medium transition-all text-zinc-400 hover:text-white hover:bg-zinc-800/60"
            title="Browse all 120 voices across 35+ languages"
          >
            Voices
          </button>
        </div>

        {/* Right Action Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Server Connection Status Pill */}
          {serverOnline === false ? (
            <div
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20"
              title="Backend server offline: Run 'node server.js'"
            >
              <span className="w-2 h-2 rounded-full bg-rose-400"></span>
              <span className="hidden xl:inline">Engine Offline</span>
            </div>
          ) : (
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border bg-zinc-900 text-zinc-300 border-zinc-800">
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
                  className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all bg-zinc-900 border-zinc-800 text-zinc-200 hover:bg-zinc-800"
                  title="View your credit allocation or upgrade packages"
                >
                  <span className="text-zinc-400">⚡</span>
                  <span className="text-white font-mono">{user.credits?.toLocaleString() || '2,000'}</span>
                  <span className="hidden xl:inline text-[11px] font-normal text-zinc-400">credits</span>
                </button>

                {/* User Avatar & Dropdown Trigger */}
                <button
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center gap-2 p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl border transition-all border-zinc-800 bg-zinc-900 text-zinc-200 hover:bg-zinc-800"
                >
                  <div className="w-6 h-6 rounded-lg bg-white text-black font-extrabold text-xs flex items-center justify-center shrink-0 uppercase">
                    {user.name ? user.name[0] : 'U'}
                  </div>
                  <span className="hidden md:inline text-xs font-semibold max-w-[100px] truncate text-white">
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
                <div className="absolute right-0 mt-2 w-64 rounded-2xl border p-2 shadow-2xl z-50 animate-fadeIn bg-[#121215] border-zinc-800 text-zinc-200">
                  <div className="px-3 py-2.5 border-b border-zinc-800/80 mb-1">
                    <p className="text-xs font-bold truncate text-white">{user.name || 'Studio Creator'}</p>
                    <p className="text-[11px] text-zinc-400 truncate">{user.email || 'user@voiceclone.ai'}</p>
                    <div className="mt-2 flex items-center justify-between text-xs">
                      <span className="text-zinc-400">Current Plan:</span>
                      <span className="font-bold text-white">{user.plan || 'Free Plan'}</span>
                    </div>
                    <div className="mt-1 flex items-center justify-between text-xs">
                      <span className="text-zinc-400">Credits Remaining:</span>
                      <span className="font-mono font-bold text-white">⚡ {user.credits?.toLocaleString() || '2,000'}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setUserDropdownOpen(false);
                      onNavigate('dashboard');
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl text-xs font-medium flex items-center gap-2 transition-colors hover:bg-zinc-800/80 text-zinc-300 hover:text-white"
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
                    className="w-full text-left px-3 py-2 rounded-xl text-xs font-medium flex items-center gap-2 transition-colors hover:bg-zinc-800/80 text-zinc-300 hover:text-white"
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
                      className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors hover:bg-zinc-800 text-white"
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
                    className="w-full text-left px-3 py-2 rounded-xl text-xs font-medium flex items-center gap-2 transition-colors hover:bg-zinc-800/80 text-zinc-200 hover:text-white"
                  >
                    <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <span>Upgrade Packages</span>
                  </button>

                  <div className="border-t border-zinc-800/80 my-1"></div>

                  <button
                    onClick={() => {
                      setUserDropdownOpen(false);
                      onLogout();
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-rose-400 flex items-center gap-2 transition-colors hover:bg-rose-500/10"
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
            /* Logged Out: Black & White Login & Signup Buttons */
            <div className="flex items-center gap-2">
              <button
                onClick={() => onOpenAuth('login')}
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all text-zinc-300 hover:text-white hover:bg-zinc-900 border border-transparent hover:border-zinc-800"
              >
                Log In
              </button>
              <button
                onClick={() => onOpenAuth('signup')}
                className="px-4 py-1.5 rounded-xl text-xs font-bold transition-all transform active:scale-95 bg-white hover:bg-zinc-200 text-black shadow-md shadow-white/5 flex items-center gap-1.5"
              >
                <span>Sign Up</span>
                <span className="hidden sm:inline opacity-70 text-[10px] font-mono">(+2k Free)</span>
              </button>
            </div>
          )}

          {/* Mobile Hamburger Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-xl border transition-all border-zinc-800 bg-zinc-900 text-zinc-300"
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
        <div className="md:hidden border-t mt-3 pt-3 pb-2 space-y-1 animate-fadeIn border-zinc-800/80 bg-[#09090b]">
          {navLinks.map((link) => (
            <button
              key={link.id}
              onClick={() => {
                setMobileMenuOpen(false);
                onNavigate(link.id);
              }}
              className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-between ${
                activePage === link.id
                  ? 'bg-white text-black font-bold'
                  : 'text-zinc-400 hover:bg-zinc-900'
              }`}
            >
              <span>{link.label}</span>
            </button>
          ))}

          <button
            onClick={() => {
              setMobileMenuOpen(false);
              onNavigate('home', '#voices');
            }}
            className="w-full text-left px-4 py-2.5 rounded-xl text-sm font-medium flex items-center justify-between text-zinc-400 hover:bg-zinc-900"
          >
            <span>Voices</span>
          </button>

          {/* Mobile Auth actions if logged out */}
          {!user && (
            <div className="pt-2 border-t border-zinc-800/60 grid grid-cols-2 gap-2 px-2">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenAuth('login');
                }}
                className="py-2 rounded-xl text-xs font-bold border text-center border-zinc-800 text-zinc-200 hover:bg-zinc-900"
              >
                Log In
              </button>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenAuth('signup');
                }}
                className="py-2 rounded-xl text-xs font-bold bg-white text-black text-center shadow-sm hover:bg-zinc-200"
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
