import React, { useState, useEffect } from 'react';
import axios from 'axios';

// Backend API URL
const API_BASE = typeof window !== 'undefined' && window.location.port === '5173' ? 'http://localhost:5000' : '';

const resolveAudioUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:')) {
    return url;
  }
  const clean = url.startsWith('/') ? url : `/${url}`;
  return `${API_BASE}${clean}`;
};

export default function UserDashboard({ user, onNavigate, onOpenManualPayment, onUpdateUser, dynamicPlans }) {
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'generations' | 'settings' | 'billing'
  const [dashboardData, setDashboardData] = useState(null);
  const [generations, setGenerations] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Profile Edit State
  const [editName, setEditName] = useState(user?.name || '');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState(null);

  // Password Change State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState(null);

  // Audio Playback
  const [playingAudioId, setPlayingAudioId] = useState(null);

  // Fetch Dashboard Data on Mount
  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/api/user/dashboard`);
      if (res.data && res.data.success) {
        setDashboardData(res.data);
        setGenerations(res.data.generations || []);
        if (res.data.user && onUpdateUser) {
          onUpdateUser(res.data.user);
        }
      }
    } catch (err) {
      console.error('Failed to load user dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserPayments = async () => {
    setLoadingPayments(true);
    try {
      const res = await axios.get(`${API_BASE}/api/user/manual-payments`);
      if (res.data && res.data.success) {
        setPayments(res.data.payments || []);
      }
    } catch (err) {
      console.error('Failed to load user manual payments:', err);
    } finally {
      setLoadingPayments(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'billing') {
      fetchUserPayments();
    }
  }, [activeTab]);

  // Handle Profile Update
  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setProfileSaving(true);
    setProfileMessage(null);

    try {
      const res = await axios.put(`${API_BASE}/api/auth/profile`, { name: editName });
      if (res.data && res.data.success) {
        setProfileMessage({ type: 'success', text: 'Display name updated successfully!' });
        if (onUpdateUser) {
          onUpdateUser(res.data.user);
        }
      }
    } catch (err) {
      setProfileMessage({ type: 'error', text: err.response?.data?.error || 'Failed to update profile.' });
    } finally {
      setProfileSaving(false);
    }
  };

  // Handle Password Change
  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordMessage(null);

    if (newPassword.length < 6) {
      setPasswordMessage({ type: 'error', text: 'New password must be at least 6 characters.' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'New passwords do not match.' });
      return;
    }

    setPasswordSaving(true);
    try {
      const res = await axios.put(`${API_BASE}/api/auth/change-password`, {
        currentPassword,
        newPassword
      });
      if (res.data && res.data.success) {
        setPasswordMessage({ type: 'success', text: 'Password changed successfully!' });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (err) {
      setPasswordMessage({ type: 'error', text: err.response?.data?.error || 'Failed to change password.' });
    } finally {
      setPasswordSaving(false);
    }
  };

  // Handle Generation Delete
  const handleDeleteGeneration = async (genId) => {
    if (!window.confirm('Are you sure you want to delete this voice generation record?')) return;

    try {
      const res = await axios.delete(`${API_BASE}/api/user/generations/${genId}`);
      if (res.data && res.data.success) {
        setGenerations(prev => prev.filter(g => g.id !== genId));
      }
    } catch (err) {
      alert('Failed to delete generation: ' + (err.response?.data?.error || err.message));
    }
  };

  const filteredGenerations = generations.filter(g => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      (g.text && g.text.toLowerCase().includes(term)) ||
      (g.referenceVoice && g.referenceVoice.toLowerCase().includes(term))
    );
  });

  const currentUser = dashboardData?.user || user;
  const stats = dashboardData?.stats || {
    totalGenerations: generations.length,
    totalCharsUsed: 0,
    creditsRemaining: currentUser?.credits || 2000,
    activePlan: currentUser?.plan || 'Free'
  };

  const navTabs = [
    {
      id: 'overview',
      label: 'Overview & Usage',
      desc: 'Platform metrics, remaining credits & quick synthesis',
      icon: (
        <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h7" />
        </svg>
      )
    },
    {
      id: 'generations',
      label: 'Generations Library',
      desc: 'Your synthesized voices and 24h temporary downloads',
      count: generations.length,
      icon: (
        <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 100-6 3 3 0 000 6z" />
        </svg>
      )
    },
    {
      id: 'billing',
      label: 'Plan & Billing Perks',
      desc: 'Manual JazzCash verification, receipts & tier limits',
      icon: (
        <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
      )
    },
    {
      id: 'settings',
      label: 'Account & Security',
      desc: 'Profile credentials, password & account preferences',
      icon: (
        <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        </svg>
      )
    }
  ];

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 animate-fadeIn text-zinc-100">
      <div className="flex flex-col lg:flex-row items-start gap-8">
        {/* ===== ASIDE BAR (SIDEBAR) ===== */}
        <aside className="w-full lg:w-72 shrink-0 space-y-6 lg:sticky lg:top-24">
          {/* Account Profile Box (NO PRO PILLS IN TITLE SECTION) */}
          <div className="p-5 rounded-3xl border bg-[#121215] border-zinc-800 shadow-xl relative overflow-hidden">
            <div className="flex items-center gap-3.5 mb-3">
              <div className="w-12 h-12 rounded-2xl bg-white text-black font-extrabold text-2xl flex items-center justify-center shrink-0 uppercase shadow-md shadow-white/5 border border-zinc-200">
                {currentUser?.name ? currentUser.name[0] : 'U'}
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-base font-extrabold text-white truncate leading-tight">
                  {currentUser?.name || 'Creator'}
                </h1>
                <p className="text-xs text-zinc-400 font-mono truncate mt-0.5">
                  {currentUser?.email}
                </p>
                <p className="text-[11px] text-zinc-500 font-mono mt-0.5">
                  Joined {new Date(currentUser?.createdAt || Date.now()).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
                </p>
              </div>
            </div>

            {/* Quick Action Buttons inside Profile Box */}
            <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-zinc-800/80">
              <button
                onClick={() => onNavigate('studio')}
                className="w-full py-2 px-3 rounded-xl text-xs font-bold bg-white text-black hover:bg-zinc-200 transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-95 cursor-pointer"
              >
                <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 100-6 3 3 0 000 6z" />
                </svg>
                <span>Studio</span>
              </button>
              <button
                onClick={() => (onOpenManualPayment ? onOpenManualPayment(currentUser?.plan === 'Free' ? 'Pro' : currentUser?.plan) : onNavigate('pricing'))}
                className="w-full py-2 px-3 rounded-xl text-xs font-bold bg-zinc-900 text-zinc-100 hover:bg-zinc-800 border border-zinc-700/80 transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
              >
                <span>⚡</span>
                <span>Top-Up</span>
              </button>
            </div>

            {(currentUser?.role === 'admin' || currentUser?.role === 'superadmin') && (
              <button
                onClick={() => onNavigate('admin')}
                className="w-full mt-2.5 py-2 px-3 rounded-xl text-xs font-bold bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <span>Admin Console</span>
              </button>
            )}
          </div>

          {/* Navigation Sections in Aside Bar */}
          <div className="p-2 sm:p-2.5 rounded-3xl border bg-[#121215] border-zinc-800 shadow-xl space-y-1">
            <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-zinc-500 font-mono">
              Dashboard Sections
            </div>
            <nav className="flex lg:flex-col gap-1.5 overflow-x-auto lg:overflow-visible pb-1 lg:pb-0 no-scrollbar">
              {navTabs.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all whitespace-nowrap lg:whitespace-normal cursor-pointer ${
                      isActive
                        ? 'bg-white text-black shadow-lg shadow-white/5'
                        : 'text-zinc-400 hover:text-white hover:bg-zinc-900 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className={isActive ? 'text-black' : 'text-zinc-400'}>
                        {tab.icon}
                      </span>
                      <span>{tab.label}</span>
                    </div>
                    {tab.count !== undefined && (
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-mono ml-2 ${
                        isActive ? 'bg-black text-white' : 'bg-zinc-800 text-zinc-300'
                      }`}>
                        {tab.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Credit Balance Mini-Card in Aside Bar */}
          <div className="p-5 rounded-3xl border bg-gradient-to-b from-[#141418] to-[#0c0c0e] border-zinc-800 shadow-lg relative overflow-hidden">
            <div className="flex items-center justify-between text-zinc-400 mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 font-mono">Remaining Credits</span>
              <span className="text-amber-400">⚡</span>
            </div>
            <div className="text-2xl font-extrabold font-mono text-white tracking-tight">
              {stats.creditsRemaining?.toLocaleString() || '2,000'}
            </div>
            <p className="text-[11px] text-zinc-400 mt-1">
              Active Tier: <span className="text-zinc-200 font-bold">{stats.activePlan}</span>
            </p>
            <button
              onClick={() => (onOpenManualPayment ? onOpenManualPayment(currentUser?.plan === 'Free' ? 'Pro' : currentUser?.plan) : onNavigate('pricing'))}
              className="mt-3.5 w-full py-2 px-3 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-black flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 cursor-pointer"
            >
              <img src="/jazzcash.webp" alt="JazzCash" className="w-4 h-4 object-contain rounded" />
              <span>Upgrade via JazzCash</span>
            </button>
          </div>
        </aside>

        {/* ===== MAIN CONTENT AREA ===== */}
        <main className="flex-1 w-full min-w-0 space-y-6">
          {/* Main Content Header Banner for Active Section */}
          <div className="p-5 sm:p-6 rounded-3xl border bg-[#121215] border-zinc-800 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-mono text-zinc-500 uppercase tracking-wider mb-1">
                <span>Account Dashboard</span>
                <span>/</span>
                <span className="text-zinc-300 font-bold">{navTabs.find(t => t.id === activeTab)?.label}</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                {navTabs.find(t => t.id === activeTab)?.label}
              </h2>
              <p className="text-xs text-zinc-400 mt-1">
                {navTabs.find(t => t.id === activeTab)?.desc}
              </p>
            </div>
            <div className="flex items-center gap-2.5">
              {activeTab === 'generations' && (
                <button
                  onClick={fetchDashboardData}
                  disabled={loading}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <span>↻ Refresh</span>
                </button>
              )}
              <button
                onClick={() => onNavigate('studio')}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-white text-black hover:bg-zinc-200 transition-all flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer"
              >
                <span>+ Synthesize Audio</span>
              </button>
            </div>
          </div>

          {/* TAB 1: OVERVIEW & USAGE */}
          {activeTab === 'overview' && (
            <div className="space-y-8">
              {/* 4 Metric KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                <div className="p-6 rounded-2xl border bg-[#121215] border-zinc-800 shadow-md">
                  <div className="flex items-center justify-between text-zinc-400 mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider">Remaining Credits</span>
                <span className="text-white">⚡</span>
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold font-mono text-white">
                {stats.creditsRemaining?.toLocaleString() || '2,000'}
              </div>
              <p className="text-[11px] text-zinc-500 mt-1">Characters available for synthesis</p>
            </div>

            <div className="p-6 rounded-2xl border bg-[#121215] border-zinc-800 shadow-md">
              <div className="flex items-center justify-between text-zinc-400 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Total Generations</span>
                <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 100-6 3 3 0 000 6z" />
                </svg>
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold font-mono text-white">
                {stats.totalGenerations || generations.length}
              </div>
              <p className="text-[11px] text-zinc-500 mt-1">Audio files created to date</p>
            </div>

            <div className="p-6 rounded-2xl border bg-[#121215] border-zinc-800 shadow-md">
              <div className="flex items-center justify-between text-zinc-400 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Chars Synthesized</span>
                <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                </svg>
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold font-mono text-white">
                {(stats.totalCharsUsed || 0).toLocaleString()}
              </div>
              <p className="text-[11px] text-zinc-500 mt-1">Total words & characters voiced</p>
            </div>

            <div className="p-6 rounded-2xl border bg-[#121215] border-zinc-800 shadow-md">
              <div className="flex items-center justify-between text-zinc-400 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Active Plan</span>
                <span className="text-xs px-2 py-0.5 rounded bg-zinc-800 font-bold text-white uppercase">{stats.activePlan}</span>
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-white">
                {(() => {
                  const matchedPlan = (dynamicPlans || []).find(
                    (p) =>
                      (p.id && p.id.toLowerCase() === (stats.activePlan || 'free').toLowerCase()) ||
                      (p.name && p.name.toLowerCase() === (stats.activePlan || 'free').toLowerCase())
                  );
                  if (matchedPlan?.maxCharsPerGen) {
                    const count = matchedPlan.maxCharsPerGen;
                    return count >= 1000 ? `${(count / 1000).toFixed(count % 1000 === 0 ? 0 : 1)}k Max` : `${count} Max`;
                  }
                  return stats.activePlan === 'Free' ? '2.5k Max' : stats.activePlan === 'Lite' ? '5k Max' : stats.activePlan === 'Pro' ? '6k Max' : '15k Max';
                })()}
              </div>
              <p className="text-[11px] text-zinc-500 mt-1">Script length limit per generation</p>
            </div>
          </div>

          {/* Recent Generations Snapshot */}
          <div className="p-6 rounded-3xl border bg-[#121215] border-zinc-800 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-white">Recent Voice Generations</h3>
                <p className="text-xs text-zinc-400">Your latest synthesized audio files</p>
              </div>
              <button
                onClick={() => setActiveTab('generations')}
                className="text-xs font-bold text-white hover:underline cursor-pointer"
              >
                View All ({generations.length}) →
              </button>
            </div>

            {generations.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-zinc-800 rounded-2xl">
                <p className="text-sm text-zinc-400 mb-3">You haven't generated any voice audio yet.</p>
                <button
                  onClick={() => onNavigate('studio')}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-white text-black hover:bg-zinc-200"
                >
                  Create Your First Clone
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {generations.slice(0, 5).map((gen) => (
                  <div key={gen.id} className="p-3.5 rounded-xl border bg-zinc-900/60 border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-white truncate">{gen.text}</p>
                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-zinc-400 mt-1">
                        <span className="font-mono text-zinc-300">🎙️ {gen.referenceVoice}</span>
                        <span>•</span>
                        <span>{gen.charsUsed || gen.text.length} characters</span>
                        <span>•</span>
                        <span>{new Date(gen.createdAt).toLocaleDateString()}</span>
                        <span>•</span>
                        {gen.isExpired ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-zinc-800 text-zinc-400 border border-zinc-700/60">
                            📁 Purged (24h)
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/10 text-amber-300 border border-amber-500/20">
                            ⏳ {gen.hoursRemaining > 0 ? `${gen.hoursRemaining}h left` : `${gen.minutesRemaining || 1}m left`}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {!gen.isExpired && gen.audioUrl ? (
                        <>
                          <audio
                            controls
                            crossOrigin="anonymous"
                            preload="metadata"
                            src={resolveAudioUrl(gen.audioUrl)}
                            className="h-8 max-w-[200px]"
                          />
                          <a
                            href={resolveAudioUrl(`/api/audio/download/${gen.id}`)}
                            download
                            className="p-1.5 rounded-lg border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-all"
                            title="Download audio within 24h window"
                          >
                            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                          </a>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            try {
                              localStorage.setItem('sk_voiceclone_preload_script', JSON.stringify({
                                text: gen.text,
                                voice: gen.referenceVoice,
                                speed: gen.speed,
                                pitch: gen.pitch,
                                pause: gen.pause
                              }));
                            } catch (e) {}
                            onNavigate('studio');
                          }}
                          className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 flex items-center gap-1 transition-all cursor-pointer"
                          title="Script is preserved in database. Click to re-synthesize in Studio"
                        >
                          <span>↺ Re-Synthesize</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: GENERATIONS LIBRARY */}
      {activeTab === 'generations' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-white">Voice Generation History</h2>
              <p className="text-xs text-zinc-400">All prompts and scripts remain permanently stored in your account</p>
            </div>
            <div className="w-full sm:w-64">
              <input
                type="text"
                placeholder="Search prompt or voice..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border text-xs bg-zinc-900 border-zinc-800 text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
              />
            </div>
          </div>

          {/* Storage Policy Info Card */}
          <div className="p-4 rounded-2xl border border-zinc-800 bg-zinc-900/50 flex items-start gap-3 text-xs">
            <span className="text-base shrink-0 mt-0.5">⏱️</span>
            <div>
              <span className="font-bold text-white block">24-Hour Temporary Audio Storage Policy</span>
              <p className="text-zinc-400 text-[11px] leading-relaxed mt-0.5">
                Generated audio files are temporarily hosted on the server for <strong>24 hours</strong> before automatic cleanup to conserve server storage and maintain optimal synthesis speeds. Your prompt text, voice settings, and timestamps remain <strong>permanently saved</strong> in your database history, allowing you to re-synthesize anytime in 1 click.
              </p>
            </div>
          </div>

          {filteredGenerations.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-zinc-800 rounded-3xl bg-[#121215]">
              <p className="text-sm text-zinc-400">No matching voice generation records found.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {filteredGenerations.map((gen) => (
                <div key={gen.id} className="p-4 rounded-2xl border bg-[#121215] border-zinc-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-semibold text-white leading-relaxed">{gen.text}</p>
                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-zinc-400 mt-2">
                      <span className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-white font-mono">
                        🎙️ {gen.referenceVoice}
                      </span>
                      <span>Speed: {gen.speed ?? -8}%</span>
                      <span>Pitch: {gen.pitch ?? -4}%</span>
                      <span>Pause: {gen.pause ?? 0.22}s</span>
                      <span>•</span>
                      <span>{gen.charsUsed || gen.text.length} chars</span>
                      <span>•</span>
                      <span>{new Date(gen.createdAt).toLocaleString()}</span>
                      <span>•</span>
                      {gen.isExpired ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-zinc-800 text-zinc-400 border border-zinc-700/60">
                          📁 Storage Purged (24h Passed)
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/10 text-amber-300 border border-amber-500/20">
                          ⏳ Download Available: {gen.hoursRemaining > 0 ? `${gen.hoursRemaining}h remaining` : `${gen.minutesRemaining || 1}m remaining`}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {!gen.isExpired && gen.audioUrl ? (
                      <>
                        <audio
                          controls
                          crossOrigin="anonymous"
                          preload="metadata"
                          src={resolveAudioUrl(gen.audioUrl)}
                          className="h-9 max-w-[220px]"
                        />
                        <a
                          href={resolveAudioUrl(`/api/audio/download/${gen.id}`)}
                          download
                          className="p-2 rounded-xl border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-white transition-all"
                          title="Download broadcast MP3 (available for 24h)"
                        >
                          <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                        </a>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          try {
                            localStorage.setItem('sk_voiceclone_preload_script', JSON.stringify({
                              text: gen.text,
                              voice: gen.referenceVoice,
                              speed: gen.speed,
                              pitch: gen.pitch,
                              pause: gen.pause
                            }));
                          } catch (e) {}
                          onNavigate('studio');
                        }}
                        className="px-3 py-2 rounded-xl text-xs font-bold bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border border-zinc-700 flex items-center gap-1.5 transition-all cursor-pointer"
                        title="Script & voice settings preserved. Click to re-synthesize in Studio"
                      >
                        <span>↺ Re-Synthesize</span>
                      </button>
                    )}

                    <button
                      onClick={() => handleDeleteGeneration(gen.id)}
                      className="p-2 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 cursor-pointer"
                      title="Delete record from history"
                    >
                      <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: ACCOUNT & SECURITY SETTINGS */}
      {activeTab === 'settings' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Profile Name Form */}
          <div className="p-6 sm:p-8 rounded-3xl border bg-[#121215] border-zinc-800 shadow-xl">
            <h3 className="text-base font-bold text-white mb-1">Personal Profile Settings</h3>
            <p className="text-xs text-zinc-400 mb-6">Update your public creator name and identity</p>

            {profileMessage && (
              <div className={`mb-4 p-3 rounded-xl text-xs font-semibold ${
                profileMessage.type === 'success'
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
              }`}>
                {profileMessage.text}
              </div>
            )}

            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1.5">
                  Display Name / Creator Handle
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border text-xs bg-zinc-900 border-zinc-800 text-white focus:outline-none focus:border-zinc-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1.5">
                  Email Address (Primary Identity)
                </label>
                <input
                  type="email"
                  disabled
                  value={currentUser?.email || ''}
                  className="w-full px-4 py-2.5 rounded-xl border text-xs bg-zinc-950 border-zinc-800/60 text-zinc-500 cursor-not-allowed"
                />
                <span className="text-[10px] text-zinc-500 mt-1 block">
                  Email address is linked to your PostgreSQL identity and cannot be changed directly.
                </span>
              </div>

              <button
                type="submit"
                disabled={profileSaving}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-white text-black hover:bg-zinc-200 transition-all cursor-pointer disabled:opacity-50"
              >
                {profileSaving ? 'Saving Changes...' : 'Save Profile Name'}
              </button>
            </form>
          </div>

          {/* Change Password Form */}
          <div className="p-6 sm:p-8 rounded-3xl border bg-[#121215] border-zinc-800 shadow-xl">
            <h3 className="text-base font-bold text-white mb-1">Security & Password</h3>
            <p className="text-xs text-zinc-400 mb-6">Manage your authenticated credentials</p>

            {passwordMessage && (
              <div className={`mb-4 p-3 rounded-xl text-xs font-semibold ${
                passwordMessage.type === 'success'
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
              }`}>
                {passwordMessage.text}
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1.5">
                  Current Password
                </label>
                <input
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 rounded-xl border text-xs bg-zinc-900 border-zinc-800 text-white focus:outline-none focus:border-zinc-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1.5">
                  New Password (min 6 characters)
                </label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 rounded-xl border text-xs bg-zinc-900 border-zinc-800 text-white focus:outline-none focus:border-zinc-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1.5">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 rounded-xl border text-xs bg-zinc-900 border-zinc-800 text-white focus:outline-none focus:border-zinc-500"
                />
              </div>

              <button
                type="submit"
                disabled={passwordSaving}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-white text-black hover:bg-zinc-200 transition-all cursor-pointer disabled:opacity-50"
              >
                {passwordSaving ? 'Updating Password...' : 'Update Password'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* TAB 4: PLAN & BILLING */}
      {activeTab === 'billing' && (
        <div className="space-y-8">
          <div className="p-8 rounded-3xl border bg-[#121215] border-zinc-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <span className="text-xs uppercase tracking-wider font-bold text-zinc-400">Current Subscription</span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
                {currentUser?.plan || 'Free'} Plan
              </h2>
              <p className="text-xs text-zinc-400 mt-1">
                Remaining character balance: <span className="font-mono font-bold text-white">⚡ {currentUser?.credits?.toLocaleString() || '2,000'}</span> credits
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => onOpenManualPayment && onOpenManualPayment(currentUser?.plan === 'Free' ? 'Pro' : currentUser?.plan)}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-black shadow-lg transition-all flex items-center gap-2 cursor-pointer active:scale-95"
              >
                <img src="/jazzcash.webp" alt="JazzCash" className="w-4 h-4 object-contain rounded" />
                <span>Upgrade Plan (JazzCash)</span>
              </button>
              <button
                onClick={() => onNavigate('pricing')}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 transition-all cursor-pointer"
              >
                Browse Packages
              </button>
            </div>
          </div>

          {/* User JazzCash Payment Requests History */}
          <div className="p-6 sm:p-8 rounded-3xl border bg-[#121215] border-zinc-800 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <img src="/jazzcash.webp" alt="JazzCash" className="w-5 h-5 object-contain rounded" />
                  <span>Manual JazzCash Payment Submissions</span>
                </h3>
                <p className="text-xs text-zinc-400 mt-1">
                  Track the verification and approval status of your JazzCash transaction IDs
                </p>
              </div>
              <button
                onClick={fetchUserPayments}
                disabled={loadingPayments}
                className="text-xs font-bold text-zinc-400 hover:text-white flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
              >
                <span>↻ Refresh Status</span>
              </button>
            </div>

            {loadingPayments ? (
              <div className="text-center py-8 text-xs text-zinc-500">
                Loading payment records...
              </div>
            ) : payments.length === 0 ? (
              <div className="text-center py-10 border border-dashed border-zinc-800 rounded-2xl bg-zinc-900/30">
                <p className="text-sm font-bold text-zinc-300">No JazzCash payments submitted yet</p>
                <p className="text-xs text-zinc-500 mt-1 max-w-md mx-auto">
                  When you upgrade your plan via JazzCash (03037108440 - AROSA), your transaction receipt and status will show up here.
                </p>
                <button
                  onClick={() => onOpenManualPayment && onOpenManualPayment('Pro')}
                  className="mt-4 px-4 py-2 rounded-xl text-xs font-bold bg-white text-black hover:bg-zinc-200 transition-all"
                >
                  Submit Payment Now
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-zinc-800 text-zinc-400">
                      <th className="pb-3 font-semibold">Transaction ID (TID)</th>
                      <th className="pb-3 font-semibold">Plan Requested</th>
                      <th className="pb-3 font-semibold">Amount</th>
                      <th className="pb-3 font-semibold">Status</th>
                      <th className="pb-3 font-semibold">Date</th>
                      <th className="pb-3 font-semibold">Admin Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60 font-mono">
                    {payments.map((p) => (
                      <tr key={p.id} className="hover:bg-zinc-900/40 transition-colors">
                        <td className="py-3 font-bold text-white tracking-wider">{p.transactionId}</td>
                        <td className="py-3 font-sans">
                          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-zinc-800 text-zinc-200">
                            {p.planType}
                          </span>
                        </td>
                        <td className="py-3 text-zinc-300">{p.amount || 'Standard'}</td>
                        <td className="py-3 font-sans">
                          {p.status === 'approved' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              ✓ Approved
                            </span>
                          )}
                          {p.status === 'pending' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/20">
                              ⏳ Pending Review
                            </span>
                          )}
                          {p.status === 'rejected' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                              ✕ Rejected
                            </span>
                          )}
                        </td>
                        <td className="py-3 text-zinc-400 text-[11px]">
                          {new Date(p.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-3 text-zinc-400 font-sans text-xs max-w-xs truncate">
                          {p.adminNotes || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl border bg-zinc-900/60 border-zinc-800">
              <h4 className="text-sm font-bold text-white mb-2">Commercial License</h4>
              <p className="text-xs text-zinc-400 leading-relaxed">
                All voice audio generated using paid plans (Lite, Pro, Studio) includes full commercial broadcast rights for YouTube, podcasts, ads, and audiobooks.
              </p>
            </div>

            <div className="p-6 rounded-2xl border bg-zinc-900/60 border-zinc-800">
              <h4 className="text-sm font-bold text-white mb-2">Instant Top-Ups</h4>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Credits roll over month-to-month and never expire. Need more characters? Upgrade anytime without losing existing audio clips.
              </p>
            </div>

            <div className="p-6 rounded-2xl border bg-zinc-900/60 border-zinc-800">
              <h4 className="text-sm font-bold text-white mb-2">Multi-Lingual Engine</h4>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Access to 120+ natural neural voices across 35+ global languages, including custom emotion controls, human cadence, and breath modulation.
              </p>
            </div>
          </div>
        </div>
      )}
        </main>
      </div>
    </div>
  );
}
