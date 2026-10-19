import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Navbar from './components/Navbar';
import HomePage from './components/HomePage';
import PricingPage from './components/PricingPage';
import StudioPage from './components/StudioPage';
import UserDashboard from './components/UserDashboard';
import AdminDashboard from './components/AdminDashboard';
import AuthModal from './components/AuthModal';
import ManualPaymentModal from './components/ManualPaymentModal';
import Footer from './components/Footer';

// Backend API URL
const API_BASE = typeof window !== 'undefined' && window.location.port === '5173' ? 'http://localhost:5000' : '';

/**
 * Maps a URL pathname to an internal active page state.
 * Supported routes:
 *   '/'          -> 'home'
 *   '/pricing'   -> 'pricing'
 *   '/studio'    -> 'studio'
 *   '/dashboard' -> 'dashboard'
 *   '/admin'     -> 'admin'
 */
const getPageFromPath = (path) => {
  const cleanPath = (path || '').toLowerCase().replace(/\/$/, '') || '/';
  if (cleanPath === '/pricing') return 'pricing';
  if (cleanPath === '/studio') return 'studio';
  if (cleanPath === '/dashboard') return 'dashboard';
  if (cleanPath === '/admin') return 'admin';
  return 'home';
};

/**
 * Updates dynamic SEO metadata, document title, and canonical link tag
 * based on the active page route.
 */
const updateSeoMetadata = (page) => {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  const origin = window.location.origin || 'https://sk-voiceclone.studio';
  const pageConfigs = {
    home: {
      url: `${origin}/`,
      title: 'SK - VoiceClone Studio | Commercial AI Voice Cloning & Neural Speech Synthesis',
      description: 'Create lifelike neural voice clones in seconds with SK - VoiceClone Studio. 120+ natural voices across 35+ languages with commercial rights.'
    },
    pricing: {
      url: `${origin}/pricing`,
      title: 'Commercial Packages & Pricing Plans | SK - VoiceClone Studio',
      description: 'Flexible, transparent pricing packages for commercial voice cloning and neural TTS synthesis. Free, Lite, Pro, and Studio tiers with broadcast rights.'
    },
    studio: {
      url: `${origin}/studio`,
      title: 'Neural Audio Workstation & Speech Studio | SK - VoiceClone Studio',
      description: 'Professional online neural voice synthesis and vocal cloning studio. Modulate speed, pitch, cadence, and human breath pauses in real-time.'
    },
    dashboard: {
      url: `${origin}/dashboard`,
      title: 'Creator Dashboard & Voice Library | SK - VoiceClone Studio',
      description: 'Access your cloned voices, audio generation logs, account analytics, and security settings.'
    },
    admin: {
      url: `${origin}/admin`,
      title: 'Platform Control & Superadmin Console | SK - VoiceClone Studio',
      description: 'System metrics, user management, and moderation controls for SK - VoiceClone Studio.'
    }
  };

  const currentConfig = pageConfigs[page] || pageConfigs.home;

  // 1. Update Title
  document.title = currentConfig.title;

  // 2. Update or Create Canonical Link Tag
  let canonicalEl = document.querySelector('link[rel="canonical"]');
  if (!canonicalEl) {
    canonicalEl = document.createElement('link');
    canonicalEl.setAttribute('rel', 'canonical');
    document.head.appendChild(canonicalEl);
  }
  canonicalEl.setAttribute('href', currentConfig.url);

  // 3. Update Meta Description
  let descMeta = document.querySelector('meta[name="description"]');
  if (!descMeta) {
    descMeta = document.createElement('meta');
    descMeta.setAttribute('name', 'description');
    document.head.appendChild(descMeta);
  }
  descMeta.setAttribute('content', currentConfig.description);

  // 4. Update Open Graph Meta Tags
  const ogUrl = document.querySelector('meta[property="og:url"]');
  if (ogUrl) ogUrl.setAttribute('content', currentConfig.url);
  const ogTitle = document.querySelector('meta[property="og:title"]');
  if (ogTitle) ogTitle.setAttribute('content', currentConfig.title);
  const ogDesc = document.querySelector('meta[property="og:description"]');
  if (ogDesc) ogDesc.setAttribute('content', currentConfig.description);
};

export default function App() {
  // Navigation: 'home' | 'studio' | 'pricing' (initialized from current browser URL)
  const [activePage, setActivePage] = useState(() => {
    if (typeof window !== 'undefined') {
      return getPageFromPath(window.location.pathname);
    }
    return 'home';
  });

  // Server Connectivity State
  const [serverOnline, setServerOnline] = useState(null);

  // Auth State
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('sk_voiceclone_auth_user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch (e) {
      return null;
    }
  });

  // Auth Modal State
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState('login'); // 'login' | 'signup'

  // Manual JazzCash Payment Modal State
  const [manualPaymentModal, setManualPaymentModal] = useState({ isOpen: false, plan: 'Pro' });

  // Dynamic Subscription Plans State
  const [plans, setPlans] = useState(() => {
    try {
      const cached = localStorage.getItem('sk_dynamic_plans_cache');
      return cached ? JSON.parse(cached) : [];
    } catch (e) {
      return [];
    }
  });

  const fetchPlans = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/plans`);
      if (res.data && res.data.success && Array.isArray(res.data.plans) && res.data.plans.length > 0) {
        setPlans(res.data.plans);
        try {
          localStorage.setItem('sk_dynamic_plans_cache', JSON.stringify(res.data.plans));
        } catch (e) {}
      }
    } catch (err) {
      console.warn('Unable to load dynamic plans:', err.message);
    }
  };

  const refreshUser = async () => {
    const token = localStorage.getItem('sk_voiceclone_auth_token');
    if (!token) return;
    try {
      const res = await axios.get(`${API_BASE}/api/auth/me`);
      if (res.data && res.data.success && res.data.user) {
        setUser(res.data.user);
        localStorage.setItem('sk_voiceclone_auth_user', JSON.stringify(res.data.user));
      }
    } catch (e) {}
  };

  // Real-time synchronization for subscription plans and user updates
  useEffect(() => {
    fetchPlans();

    const handlePlansUpdated = (e) => {
      if (e?.detail && Array.isArray(e.detail)) {
        setPlans(e.detail);
      } else {
        fetchPlans();
      }
    };

    const handleUserUpdated = (e) => {
      if (e?.detail) {
        setUser(e.detail);
        try {
          localStorage.setItem('sk_voiceclone_auth_user', JSON.stringify(e.detail));
        } catch (err) {}
      } else {
        refreshUser();
      }
    };

    const handleStorageChange = (e) => {
      if (e.key === 'sk_dynamic_plans_cache' && e.newValue) {
        try {
          setPlans(JSON.parse(e.newValue));
        } catch (err) {}
      }
    };

    window.addEventListener('sk-plans-updated', handlePlansUpdated);
    window.addEventListener('sk-user-updated', handleUserUpdated);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('sk-plans-updated', handlePlansUpdated);
      window.removeEventListener('sk-user-updated', handleUserUpdated);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Update dynamic SEO and canonical tags whenever activePage changes
  useEffect(() => {
    updateSeoMetadata(activePage);
  }, [activePage]);

  // Initial route protection and deep link validation
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const initialPath = getPageFromPath(window.location.pathname);
      if ((initialPath === 'studio' || initialPath === 'dashboard') && !user) {
        setActivePage('home');
        window.history.replaceState({ page: 'home' }, '', '/');
        handleOpenAuth('login');
      } else if (initialPath === 'admin' && (!user || (user.role !== 'admin' && user.role !== 'superadmin'))) {
        setActivePage('home');
        window.history.replaceState({ page: 'home' }, '', '/');
      } else {
        const expectedPath = initialPath === 'pricing' ? '/pricing' : initialPath === 'studio' ? '/studio' : initialPath === 'dashboard' ? '/dashboard' : initialPath === 'admin' ? '/admin' : '/';
        if (window.location.pathname !== expectedPath) {
          window.history.replaceState({ page: initialPath }, '', expectedPath);
        }
      }
    }
  }, []);

  // Handle browser back and forward button events
  useEffect(() => {
    const handlePopState = () => {
      const targetPage = getPageFromPath(window.location.pathname);
      if ((targetPage === 'studio' || targetPage === 'dashboard') && !user) {
        setActivePage('home');
        window.history.replaceState({ page: 'home' }, '', '/');
        handleOpenAuth('login');
      } else if (targetPage === 'admin' && (!user || (user.role !== 'admin' && user.role !== 'superadmin'))) {
        setActivePage('home');
        window.history.replaceState({ page: 'home' }, '', '/');
      } else {
        setActivePage(targetPage);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [user]);

  // Initialize Axios Authorization header from localStorage on load & validate session
  useEffect(() => {
    const token = localStorage.getItem('sk_voiceclone_auth_token');
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      // Verify session and fetch fresh credit balance & plan from PostgreSQL
      axios.get(`${API_BASE}/api/auth/me`)
        .then((res) => {
          if (res.data && res.data.success && res.data.user) {
            setUser(res.data.user);
            localStorage.setItem('sk_voiceclone_auth_user', JSON.stringify(res.data.user));
          }
        })
        .catch((err) => {
          if (err.response && (err.response.status === 401 || err.response.status === 403)) {
            // Token is expired or invalid
            localStorage.removeItem('sk_voiceclone_auth_token');
            localStorage.removeItem('sk_voiceclone_auth_user');
            delete axios.defaults.headers.common['Authorization'];
            setUser(null);
          }
        });
    }
  }, []);

  // Check server connectivity on startup
  useEffect(() => {
    const checkServer = async () => {
      try {
        await axios.get(`${API_BASE}/api/voices`, { timeout: 4000 });
        setServerOnline(true);
      } catch (err) {
        console.warn('Backend server unreachable:', err.message);
        setServerOnline(false);
      }
    };
    checkServer();
  }, []);

  // Monochromatic Luxury Theme (Black & White with subtle zinc - Permanent Dark)
  const theme = {
    bg: 'bg-[#09090b] text-zinc-100',
    headerBg: 'bg-[#09090b]/95 border-zinc-800/80',
    cardBg: 'bg-[#121215] border-zinc-800/80 shadow-2xl',
    panelBg: 'bg-[#18181b]/80 border-zinc-800',
    inputBg: 'bg-[#18181b] border-zinc-800 text-zinc-100 placeholder-zinc-500 focus:border-zinc-500 focus:ring-zinc-600',
    sidebarBg: 'bg-[#121215] border-zinc-800/80 shadow-2xl',
    textMuted: 'text-zinc-400',
    border: 'border-zinc-800',
    btnPrimary: 'bg-white hover:bg-zinc-200 text-black shadow-md shadow-white/5 active:scale-[0.99] font-bold',
    btnSecondary: 'bg-zinc-900 hover:bg-zinc-800 text-zinc-100 border border-zinc-700/80 shadow-sm active:scale-[0.99]'
  };

  // Auth Handlers
  const handleOpenAuth = (mode = 'login') => {
    setAuthModalMode(mode);
    setAuthModalOpen(true);
  };

  // Manual Payment Modal Handler
  const handleOpenManualPayment = (plan = 'Pro') => {
    if (!user) {
      handleOpenAuth('signup');
      return;
    }
    setManualPaymentModal({ isOpen: true, plan: plan || 'Pro' });
  };

  const handleLoginSuccess = (userData, token) => {
    setUser(userData);
    if (token) {
      localStorage.setItem('sk_voiceclone_auth_token', token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
    try {
      localStorage.setItem('sk_voiceclone_auth_user', JSON.stringify(userData));
    } catch (e) {}
    setActivePage('studio');
    if (typeof window !== 'undefined') {
      window.history.pushState({ page: 'studio' }, '', '/studio');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleLogout = () => {
    setUser(null);
    try {
      localStorage.removeItem('sk_voiceclone_auth_token');
      localStorage.removeItem('sk_voiceclone_auth_user');
      delete axios.defaults.headers.common['Authorization'];
    } catch (e) {}
    if (activePage === 'studio' || activePage === 'dashboard' || activePage === 'admin') {
      setActivePage('home');
      if (typeof window !== 'undefined') {
        window.history.pushState({ page: 'home' }, '', '/');
      }
    }
  };

  const handleSelectPlan = async (planId, creditCount) => {
    if (!user) {
      handleOpenAuth('signup');
      return;
    }
    try {
      const token = localStorage.getItem('sk_voiceclone_auth_token');
      const res = await axios.post(`${API_BASE}/api/auth/update-plan`, {
        plan: planId,
        creditCount: creditCount
      }, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (res.data && res.data.success && res.data.user) {
        setUser(res.data.user);
        localStorage.setItem('sk_voiceclone_auth_user', JSON.stringify(res.data.user));
        return;
      }
    } catch (err) {
      console.warn('Backend plan update warning, applying local fallback:', err.message);
    }
    const updatedUser = {
      ...user,
      plan: planId,
      credits: (user.credits || 0) + creditCount
    };
    setUser(updatedUser);
    try {
      localStorage.setItem('sk_voiceclone_auth_user', JSON.stringify(updatedUser));
    } catch (e) {}
  };

  const handleDeductCredits = (val, isExactRemaining = false) => {
    if (!user) return;
    const newCreditCount = isExactRemaining ? val : Math.max(0, (user.credits || 2000) - val);
    const updatedUser = {
      ...user,
      credits: newCreditCount
    };
    setUser(updatedUser);
    try {
      localStorage.setItem('sk_voiceclone_auth_user', JSON.stringify(updatedUser));
    } catch (e) {}
  };

  /**
   * Primary navigation function supporting path updates and anchor scrolls.
   * Updates browser address bar URL cleanly using HTML5 pushState.
   */
  const handleNavigate = (page, hash = null) => {
    fetchPlans();
    refreshUser();

    if ((page === 'studio' || page === 'dashboard') && !user) {
      handleOpenAuth('login');
      return;
    }

    if (page === 'admin' && (!user || (user.role !== 'admin' && user.role !== 'superadmin'))) {
      handleOpenAuth('login');
      return;
    }

    setActivePage(page);
    const targetPath = page === 'pricing' ? '/pricing' : page === 'studio' ? '/studio' : page === 'dashboard' ? '/dashboard' : page === 'admin' ? '/admin' : '/';

    if (typeof window !== 'undefined') {
      if (window.location.pathname !== targetPath) {
        window.history.pushState({ page }, '', targetPath);
      }

      if (hash) {
        setTimeout(() => {
          const el = document.querySelector(hash);
          if (el) el.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  };

  return (
    <div className={`min-h-screen ${theme.bg} font-sans flex flex-col relative overflow-x-clip selection:bg-zinc-800 selection:text-white`}>
      {/* Background Logo Watermark (Monochromatic Invert) */}
      <div
        className="fixed inset-0 pointer-events-none z-0 flex items-center justify-end overflow-hidden select-none logo-watermark-layer pr-4 sm:pr-8 md:pr-12 lg:pr-16"
        aria-hidden="true"
      >
        <div
          className="flex flex-col items-center justify-center text-center logo-watermark-content"
          style={{ opacity: 0.19 }}
        >
          <img
            src="/favicon.svg"
            alt="SK - VoiceClone Studio Logo Watermark"
            className="w-[400px] h-[400px] sm:w-[540px] sm:h-[540px] md:w-[680px] md:h-[680px] lg:w-[820px] lg:h-[820px] max-w-[95vw] max-h-[90vh] object-contain logo-watermark-img invert brightness-125 drop-shadow-[0_0_80px_rgba(255,255,255,0.18)]"
            draggable={false}
          />
        </div>
      </div>

      {/* Navigation Bar: Studio button hidden unless logged in; No pills with page names */}
      <Navbar
        activePage={activePage}
        onNavigate={handleNavigate}
        serverOnline={serverOnline}
        user={user}
        onOpenAuth={handleOpenAuth}
        onLogout={handleLogout}
      />

      {/* Backend Offline Warning Banner (if offline) */}
      {serverOnline === false && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 text-amber-300 text-xs px-4 py-2 text-center flex items-center justify-center gap-2 relative z-30">
          <svg width="16" height="16" className="w-4 h-4 text-amber-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span>
            Node.js backend is offline. Start the backend in your terminal using: <code className="bg-amber-500/20 px-1.5 py-0.5 rounded font-mono">node server.js</code>
          </span>
        </div>
      )}

      {/* Main Page Rendering */}
      <main className="flex-1 flex flex-col relative z-10">
        {activePage === 'home' && (
          <HomePage
            onNavigate={handleNavigate}
            onOpenAuth={handleOpenAuth}
            user={user}
          />
        )}

        {activePage === 'studio' && (
          user ? (
            <StudioPage
              user={user}
              onDeductCredits={handleDeductCredits}
              onNavigate={handleNavigate}
              onOpenManualPayment={handleOpenManualPayment}
              theme={theme}
              serverOnline={serverOnline}
              dynamicPlans={plans}
              onRefreshUser={refreshUser}
            />
          ) : (
            <HomePage
              onNavigate={handleNavigate}
              onOpenAuth={handleOpenAuth}
              user={user}
            />
          )
        )}

        {activePage === 'dashboard' && (
          user ? (
            <UserDashboard
              user={user}
              onNavigate={handleNavigate}
              onOpenManualPayment={handleOpenManualPayment}
              dynamicPlans={plans}
              onUpdateUser={(updated) => {
                setUser(updated);
                try {
                  localStorage.setItem('sk_voiceclone_auth_user', JSON.stringify(updated));
                } catch (e) {}
              }}
            />
          ) : (
            <HomePage
              onNavigate={handleNavigate}
              onOpenAuth={handleOpenAuth}
              user={user}
            />
          )
        )}

        {activePage === 'admin' && (
          (user && (user.role === 'admin' || user.role === 'superadmin')) ? (
            <AdminDashboard
              user={user}
              onNavigate={handleNavigate}
            />
          ) : (
            <HomePage
              onNavigate={handleNavigate}
              onOpenAuth={handleOpenAuth}
              user={user}
            />
          )
        )}

        {activePage === 'pricing' && (
          <PricingPage
            user={user}
            onSelectPlan={handleSelectPlan}
            onOpenManualPayment={handleOpenManualPayment}
            onNavigate={handleNavigate}
            onOpenAuth={handleOpenAuth}
            dynamicPlans={plans}
          />
        )}
      </main>

      {/* Shared Footer across the site */}
      <Footer onNavigate={handleNavigate} />

      {/* Auth Modal (Login / Sign Up) */}
      <AuthModal
        isOpen={authModalOpen}
        initialMode={authModalMode}
        onClose={() => setAuthModalOpen(false)}
        onLoginSuccess={handleLoginSuccess}
      />

      {/* Manual JazzCash Payment Modal */}
      <ManualPaymentModal
        isOpen={manualPaymentModal.isOpen}
        initialPlan={manualPaymentModal.plan}
        user={user}
        onClose={() => setManualPaymentModal(prev => ({ ...prev, isOpen: false }))}
        onPaymentSuccess={(_data) => {
          // Re-fetch user to reflect any instant updates
          const token = localStorage.getItem('sk_voiceclone_auth_token');
          if (token) {
            axios.get(`${API_BASE}/api/auth/me`).then((res) => {
              if (res.data?.success && res.data?.user) {
                setUser(res.data.user);
                localStorage.setItem('sk_voiceclone_auth_user', JSON.stringify(res.data.user));
              }
            }).catch(() => {});
          }
        }}
      />
    </div>
  );
}
