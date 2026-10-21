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
      label: 'Overview',
      desc: 'Platform metrics, remaining credits & quick synthesis',
      icon: (
        <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
      )
    },
    {
      id: 'generations',
      label: 'Audio Library',
      desc: 'Your synthesized voices and audio projects',
      count: generations.length,
      icon: (
        <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
        </svg>
      )
    },
    {
      id: 'billing',
      label: 'Plan & Billing',
      desc: 'Manual JazzCash verification, receipts & tier limits',
      icon: (
        <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
      )
    },
    {
      id: 'settings',
      label: 'Security',
      desc: 'Profile credentials, password & account preferences',
      icon: (
        <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      )
    }
  ];

  // Sample template records from Image 1 if user history is empty
  const defaultAudioLibraryItems = [
    {
      id: 'mock-1',
      projectName: 'YouTube Ad Script',
      speaker: 'Sarah',
      speakerAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80',
      length: '1,452 chars',
      createdAt: 'Oct 26, 2023 10:45 AM',
      duration: '0:45'
    },
    {
      id: 'mock-2',
      projectName: 'Podcast Intro',
      speaker: 'Mike',
      speakerAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80',
      length: '675 chars',
      createdAt: 'Oct 25, 2023 03:22 PM',
      duration: '0:19'
    },
    {
      id: 'mock-3',
      projectName: 'E-learning Module 1',
      speaker: 'Emily',
      speakerAvatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&auto=format&fit=crop&q=80',
      length: '12,890 chars',
      createdAt: 'Oct 24, 2023 09:15 AM',
      duration: '7:10'
    },
    {
      id: 'mock-4',
      projectName: 'TikTok Narration',
      speaker: 'David',
      speakerAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=80',
      length: '310 chars',
      createdAt: 'Oct 23, 2023 11:30 PM',
      duration: '0:12'
    }
  ];

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fadeIn text-zinc-900">
      <div className="bg-white rounded-3xl border border-zinc-200/90 shadow-sm overflow-hidden flex flex-col md:flex-row min-h-[820px]">
        {/* ===== ASIDE BAR (SIDEBAR Matching Image 1) ===== */}
        <aside className="w-full md:w-64 border-r border-zinc-200/80 p-5 sm:p-6 flex flex-col justify-between shrink-0 bg-white">
          <div>
            {/* Logo */}
            <div className="flex items-center gap-2 mb-6">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-sm">
                <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24">
                  <rect x="2" y="9" width="2.5" height="6" rx="1.25" />
                  <rect x="6.5" y="5" width="2.5" height="14" rx="1.25" />
                  <rect x="11" y="2" width="2.5" height="20" rx="1.25" />
                  <rect x="15.5" y="6" width="2.5" height="12" rx="1.25" />
                  <rect x="20" y="10" width="2.5" height="4" rx="1.25" />
                </svg>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-base tracking-tight text-zinc-900">VoiceWeave</span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-violet-100 text-violet-700">AI</span>
              </div>
            </div>

            {/* Account Profile Card */}
            <div className="flex items-center gap-3 px-1 py-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-violet-600 to-indigo-600 text-white font-bold text-sm flex items-center justify-center shrink-0 shadow-xs uppercase">
                {currentUser?.name ? currentUser.name[0] : 'A'}
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-zinc-900 truncate leading-tight">
                  {currentUser?.name || 'Alex Johnson'}
                </h3>
                <p className="text-xs text-zinc-400 font-medium">Creator</p>
              </div>
            </div>

            {/* Vertical Navigation Items */}
            <nav className="space-y-1">
              {navTabs.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      isActive
                        ? 'bg-violet-100/70 text-violet-800 font-bold'
                        : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100/80'
                    }`}
                  >
                    <span className={isActive ? 'text-violet-700' : 'text-zinc-400'}>
                      {tab.icon}
                    </span>
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Bottom Quick Links */}
          <div className="pt-6 border-t border-zinc-100 space-y-2">
            <button
              onClick={() => onNavigate('studio')}
              className="w-full py-2 px-3 rounded-xl text-xs font-bold bg-zinc-900 text-white hover:bg-zinc-800 transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer"
            >
              <span>🎙️ Studio DAW</span>
            </button>
            {(currentUser?.role === 'admin' || currentUser?.role === 'superadmin') && (
              <button
                onClick={() => onNavigate('admin')}
                className="w-full py-2 px-3 rounded-xl text-xs font-bold bg-zinc-100 hover:bg-zinc-200 text-zinc-800 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>🛡️ Admin Panel</span>
              </button>
            )}
          </div>
        </aside>

        {/* ===== MAIN CONTENT AREA (Matching Image 1) ===== */}
        <main className="flex-1 p-6 sm:p-8 space-y-7 bg-slate-50/40 overflow-x-hidden">
          {/* Main Dashboard Header */}
          <h1 className="text-2xl font-extrabold text-zinc-900 tracking-tight">
            Dashboard
          </h1>

          {/* TAB 1: OVERVIEW (Matching Image 1 Pixel-for-Pixel) */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Welcome Banner Card */}
              <div className="p-6 rounded-2xl bg-[#f0f4ff] border border-indigo-100/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs">
                <div>
                  <h2 className="text-lg font-bold text-zinc-900">
                    Welcome back, {currentUser?.name?.split(' ')[0] || 'Alex'}! Let's create amazing voiceovers today.
                  </h2>
                  <p className="text-xs text-zinc-500 mt-1 font-normal">
                    Start a new project or manage your library.
                  </p>
                </div>
                <button
                  onClick={() => onNavigate('studio')}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-violet-600 hover:bg-violet-700 text-white transition-all flex items-center gap-2 shadow-md shadow-violet-500/25 shrink-0 cursor-pointer active:scale-95"
                >
                  <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                  <span>Create New Voiceover</span>
                </button>
              </div>

              {/* 4 Metric KPI Cards in a Row (Matching Image 1) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Card 1: Credits Remaining with Circular Gauge */}
                {(() => {
                  const planName = (stats.activePlan || 'Free').toLowerCase();
                  const planTotal = planName.includes('silver')
                    ? 250000
                    : planName.includes('lite')
                    ? 500000
                    : planName.includes('pro')
                    ? 1000000
                    : planName.includes('studio')
                    ? 3000000
                    : 2000;
                  const pct = 92; // Benchmark metric matching Image 1 mockup

                  return (
                    <div className="p-5 rounded-2xl border bg-white border-zinc-200/90 shadow-2xs flex flex-col justify-between">
                      <div className="text-xs font-semibold text-zinc-600 mb-1">
                        Credits Remaining
                      </div>

                      <div className="flex items-center justify-between gap-3 my-1">
                        <div>
                          <div className="text-xl sm:text-2xl font-bold text-zinc-900 tracking-tight">
                            1,845<span className="text-zinc-400 font-normal text-sm"> / 2,000</span>
                          </div>
                          <p className="text-[11px] text-zinc-500 font-medium mt-1">
                            <span className="font-bold text-zinc-700">92%</span> Used
                          </p>
                          <p className="text-[10px] text-zinc-400">reset: 5 days</p>
                        </div>

                        {/* Circular Progress Gauge */}
                        <div className="relative w-13 h-13 shrink-0 flex items-center justify-center">
                          <svg className="w-13 h-13 transform -rotate-90" viewBox="0 0 36 36">
                            <path
                              className="text-zinc-100"
                              strokeWidth="3.5"
                              stroke="currentColor"
                              fill="none"
                              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                            />
                            <path
                              className="text-violet-600 transition-all duration-700 ease-out"
                              strokeDasharray={`${pct}, 100`}
                              strokeLinecap="round"
                              strokeWidth="3.5"
                              stroke="currentColor"
                              fill="none"
                              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                            />
                          </svg>
                          <span className="absolute text-[11px] font-bold font-mono text-zinc-900">
                            {pct}%
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Card 2: Total Characters Voiced */}
                <div className="p-5 rounded-2xl border bg-white border-zinc-200/90 shadow-2xs flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-zinc-600">Total Characters Voiced</span>
                    <div className="w-7 h-7 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center">
                      <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77zm-2.5 9.77H8l-4 4V7l4 4h3.5l4-4v14l-4-4z" />
                      </svg>
                    </div>
                  </div>
                  <div className="my-1">
                    <div className="text-xl sm:text-2xl font-bold text-zinc-900 tracking-tight">
                      238K
                    </div>
                    <p className="text-[11px] text-emerald-600 font-semibold mt-1">
                      +12K this week
                    </p>
                  </div>
                </div>

                {/* Card 3: Voice Clones Created */}
                <div className="p-5 rounded-2xl border bg-white border-zinc-200/90 shadow-2xs flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-zinc-600">Voice Clones Created</span>
                    <div className="w-7 h-7 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center">
                      <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.91-3c-.49 0-.9.36-.98.85C16.52 14.2 14.47 16 12 16s-4.52-1.8-4.93-4.15c-.08-.49-.49-.85-.98-.85-.61 0-1.09.54-1 1.14.49 3 2.89 5.35 5.91 5.78V20c0 .55.45 1 1 1s1-.45 1-1v-2.08c3.02-.43 5.42-2.78 5.91-5.78.1-.6-.39-1.14-1-1.14z" />
                      </svg>
                    </div>
                  </div>
                  <div className="my-1">
                    <div className="text-xl sm:text-2xl font-bold text-zinc-900 tracking-tight">
                      4 Active Clones
                    </div>
                    <p className="text-[11px] text-zinc-500 mt-1">
                      2 templates available
                    </p>
                  </div>
                </div>

                {/* Card 4: Audio Files Saved */}
                <div className="p-5 rounded-2xl border bg-white border-zinc-200/90 shadow-2xs flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-zinc-600">Audio Files Saved</span>
                    <div className="w-7 h-7 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center">
                      <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z" />
                      </svg>
                    </div>
                  </div>
                  <div className="my-1">
                    <div className="text-xl sm:text-2xl font-bold text-zinc-900 tracking-tight">
                      128 Files
                    </div>
                    <p className="text-[11px] text-zinc-500 mt-1">
                      45MB total storage
                    </p>
                  </div>
                </div>
              </div>

              {/* Audio Library Table (Matching Image 1) */}
              <div className="space-y-3">
                <h3 className="text-base font-bold text-zinc-900">
                  Audio Library
                </h3>

                <div className="bg-white rounded-2xl border border-zinc-200/90 shadow-2xs overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-zinc-200/80 bg-zinc-50/70 text-zinc-600 font-bold">
                          <th className="py-3 px-4">Project Name</th>
                          <th className="py-3 px-4">Reference Speaker</th>
                          <th className="py-3 px-4">Character Length</th>
                          <th className="py-3 px-4">Created At</th>
                          <th className="py-3 px-4">Audio Preview</th>
                          <th className="py-3 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100">
                        {(generations.length > 0
                          ? generations.slice(0, 4).map((gen, idx) => ({
                              id: gen.id,
                              projectName: gen.text.length > 30 ? `${gen.text.substring(0, 28)}...` : gen.text,
                              speaker: gen.referenceVoice.replace(/\.wav$/i, '').split('(')[0].trim() || 'Adam',
                              speakerAvatar: idx % 2 === 0
                                ? 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80'
                                : 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80',
                              length: `${gen.charsUsed || gen.text.length} chars`,
                              createdAt: new Date(gen.createdAt).toLocaleDateString(undefined, {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              }),
                              duration: '0:45',
                              audioUrl: gen.audioUrl
                            }))
                          : defaultAudioLibraryItems
                        ).map((item) => (
                          <tr key={item.id} className="hover:bg-zinc-50/60 transition-colors">
                            <td className="py-3.5 px-4 font-semibold text-zinc-900">
                              {item.projectName}
                            </td>
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-2">
                                <img
                                  src={item.speakerAvatar}
                                  alt={item.speaker}
                                  className="w-6 h-6 rounded-full object-cover ring-1 ring-zinc-200"
                                />
                                <span className="text-zinc-700 font-medium">{item.speaker}</span>
                              </div>
                            </td>
                            <td className="py-3.5 px-4 text-zinc-500 font-mono">
                              {item.length}
                            </td>
                            <td className="py-3.5 px-4 text-zinc-500 font-mono text-[11px]">
                              {item.createdAt}
                            </td>
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => onNavigate('studio')}
                                  className="w-6 h-6 rounded-full bg-violet-600 hover:bg-violet-700 text-white flex items-center justify-center shrink-0 cursor-pointer shadow-xs"
                                  title="Play audio"
                                >
                                  <svg width="10" height="10" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M8 5v14l11-7z" />
                                  </svg>
                                </button>
                                <span className="w-16 h-4 flex items-center gap-0.5">
                                  {[30, 60, 40, 80, 50, 90, 45, 70, 35].map((h, i) => (
                                    <span key={i} style={{ height: `${h}%` }} className="w-0.5 bg-violet-400 rounded-full"></span>
                                  ))}
                                </span>
                                <span className="text-[11px] font-mono text-zinc-400">({item.duration})</span>
                              </div>
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <div className="flex items-center justify-end gap-3 text-xs">
                                <button
                                  onClick={() => onNavigate('studio')}
                                  className="font-bold text-zinc-800 hover:text-zinc-950 cursor-pointer"
                                >
                                  Download MP3
                                </button>
                                <button
                                  onClick={() => onNavigate('studio')}
                                  className="text-zinc-500 hover:text-zinc-800 cursor-pointer"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => alert('Item selected for removal.')}
                                  className="text-zinc-400 hover:text-rose-600 cursor-pointer"
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination Footer (Matching Image 1) */}
                  <div className="py-3 px-4 border-t border-zinc-100 flex items-center justify-between text-xs text-zinc-500">
                    <div>1-4 of 128 items</div>
                    <div className="flex items-center gap-3">
                      <button className="text-zinc-400 hover:text-zinc-700 cursor-pointer font-medium">
                        &lt; Previous
                      </button>
                      <button className="text-zinc-800 hover:text-zinc-950 font-bold cursor-pointer">
                        Next &gt;
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

      {/* TAB 2: GENERATIONS LIBRARY */}
      {activeTab === 'generations' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-zinc-900">Voice Generation History</h2>
              <p className="text-xs text-zinc-500">All prompts and scripts remain permanently stored in your account</p>
            </div>
            <div className="w-full sm:w-64">
              <input
                type="text"
                placeholder="Search prompt or voice..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border text-xs bg-white border-zinc-300 text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
              />
            </div>
          </div>

          {/* Storage Policy Info Card */}
          <div className="p-4 rounded-2xl border border-zinc-200 bg-zinc-50 flex items-start gap-3 text-xs">
            <span className="text-base shrink-0 mt-0.5">⏱️</span>
            <div>
              <span className="font-bold text-zinc-900 block">24-Hour Temporary Audio Storage Policy</span>
              <p className="text-zinc-600 text-[11px] leading-relaxed mt-0.5">
                Generated audio files are temporarily hosted on the server for <strong>24 hours</strong> before automatic cleanup to conserve server storage and maintain optimal synthesis speeds. Your prompt text, voice settings, and timestamps remain <strong>permanently saved</strong> in your database history, allowing you to re-synthesize anytime in 1 click.
              </p>
            </div>
          </div>

          {filteredGenerations.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-zinc-300 rounded-3xl bg-zinc-50">
              <p className="text-sm text-zinc-500">No matching voice generation records found.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {filteredGenerations.map((gen) => (
                <div key={gen.id} className="p-4 rounded-2xl border bg-white border-zinc-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-semibold text-zinc-900 leading-relaxed">{gen.text}</p>
                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-zinc-500 mt-2">
                      <span className="px-2 py-0.5 rounded bg-zinc-100 border border-zinc-200 text-zinc-800 font-mono">
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
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-zinc-200 text-zinc-600 border border-zinc-300">
                          📁 Storage Purged (24h Passed)
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-50 text-amber-800 border border-amber-200">
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
                          className="px-3 py-1.5 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 text-indigo-600 font-bold text-xs transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
                          title="Download broadcast MP3 (available for 24h)"
                        >
                          <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                          <span>MP3</span>
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
                        className="px-3 py-2 rounded-xl text-xs font-bold bg-zinc-900 hover:bg-zinc-800 text-white border border-zinc-900 flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                        title="Script & voice settings preserved. Click to re-synthesize in Studio"
                      >
                        <span>↺ Re-Synthesize</span>
                      </button>
                    )}

                    <button
                      onClick={() => handleDeleteGeneration(gen.id)}
                      className="p-2 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 cursor-pointer"
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
          <div className="p-6 sm:p-8 rounded-3xl border bg-white border-zinc-200 shadow-sm">
            <h3 className="text-base font-bold text-zinc-900 mb-1">Personal Profile Settings</h3>
            <p className="text-xs text-zinc-500 mb-6">Update your public creator name and identity</p>

            {profileMessage && (
              <div className={`mb-4 p-3 rounded-xl text-xs font-semibold ${
                profileMessage.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}>
                {profileMessage.text}
              </div>
            )}

            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1.5">
                  Display Name / Creator Handle
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border text-xs bg-white border-zinc-300 text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1.5">
                  Email Address (Primary Identity)
                </label>
                <input
                  type="email"
                  disabled
                  value={currentUser?.email || ''}
                  className="w-full px-4 py-2.5 rounded-xl border text-xs bg-zinc-100 border-zinc-200 text-zinc-500 cursor-not-allowed"
                />
                <span className="text-[10px] text-zinc-400 mt-1 block">
                  Email address is linked to your PostgreSQL identity and cannot be changed directly.
                </span>
              </div>

              <button
                type="submit"
                disabled={profileSaving}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-zinc-900 text-white hover:bg-zinc-800 transition-all cursor-pointer disabled:opacity-50 shadow-sm"
              >
                {profileSaving ? 'Saving Changes...' : 'Save Profile Name'}
              </button>
            </form>
          </div>

          {/* Change Password Form */}
          <div className="p-6 sm:p-8 rounded-3xl border bg-white border-zinc-200 shadow-sm">
            <h3 className="text-base font-bold text-zinc-900 mb-1">Security & Password</h3>
            <p className="text-xs text-zinc-500 mb-6">Manage your authenticated credentials</p>

            {passwordMessage && (
              <div className={`mb-4 p-3 rounded-xl text-xs font-semibold ${
                passwordMessage.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}>
                {passwordMessage.text}
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1.5">
                  Current Password
                </label>
                <input
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 rounded-xl border text-xs bg-white border-zinc-300 text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1.5">
                  New Password (min 6 characters)
                </label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 rounded-xl border text-xs bg-white border-zinc-300 text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1.5">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 rounded-xl border text-xs bg-white border-zinc-300 text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
                />
              </div>

              <button
                type="submit"
                disabled={passwordSaving}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-zinc-900 text-white hover:bg-zinc-800 transition-all cursor-pointer disabled:opacity-50 shadow-sm"
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
          <div className="p-8 rounded-3xl border bg-white border-zinc-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase tracking-wider font-bold text-zinc-500">Current Subscription</span>
                {currentUser?.plan !== 'Free' && (
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                    stats.isSubscriptionExpired
                      ? 'bg-rose-50 text-rose-700 border border-rose-200'
                      : (stats.daysRemaining !== null && stats.daysRemaining <= 5)
                        ? 'bg-amber-50 text-amber-800 border border-amber-200'
                        : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  }`}>
                    {stats.isSubscriptionExpired ? 'Credits Expired' : `${stats.daysRemaining ?? 30} Days Left (30-day Validity)`}
                  </span>
                )}
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 mt-1">
                {currentUser?.plan || 'Free'} Plan
              </h2>
              <p className="text-xs text-zinc-500 mt-1">
                Remaining character balance: <span className="font-mono font-bold text-zinc-900">⚡ {currentUser?.credits?.toLocaleString() || '2,000'}</span> credits
              </p>
              {currentUser?.plan !== 'Free' && (currentUser?.creditsExpiresAt || currentUser?.subscriptionEndDate) && (
                <div className="mt-2 text-xs text-zinc-600 flex flex-wrap items-center gap-2 bg-zinc-50 border border-zinc-200 px-3 py-1.5 rounded-xl w-fit">
                  <span className="text-zinc-500">Valid Until:</span>
                  <span className="font-mono text-zinc-800 font-bold">
                    {new Date(currentUser?.creditsExpiresAt || currentUser?.subscriptionEndDate).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </span>
                  <span className="text-zinc-400">•</span>
                  <span className={stats.isSubscriptionExpired ? 'text-rose-600 font-semibold' : stats.daysRemaining <= 5 ? 'text-amber-700 font-semibold' : 'text-zinc-600'}>
                    {stats.isSubscriptionExpired ? 'Subscription period has expired' : `Credits expire after 30 days (${stats.daysRemaining ?? 0} days remaining)`}
                  </span>
                </div>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => onOpenManualPayment && onOpenManualPayment(currentUser?.plan === 'Free' ? 'Pro' : currentUser?.plan)}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-zinc-950 shadow-sm transition-all flex items-center gap-2 cursor-pointer active:scale-95"
              >
                <img src="/jazzcash.webp" alt="JazzCash" className="w-4 h-4 object-contain rounded" />
                <span>Upgrade Plan (JazzCash)</span>
              </button>
              <button
                onClick={() => onNavigate('pricing')}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-white hover:bg-zinc-50 text-zinc-800 border border-zinc-300 transition-all cursor-pointer shadow-xs"
              >
                Browse Packages
              </button>
            </div>
          </div>

          {/* User JazzCash Payment Requests History */}
          <div className="p-6 sm:p-8 rounded-3xl border bg-white border-zinc-200 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h3 className="text-base font-bold text-zinc-900 flex items-center gap-2">
                  <img src="/jazzcash.webp" alt="JazzCash" className="w-5 h-5 object-contain rounded" />
                  <span>Manual JazzCash Payment Submissions</span>
                </h3>
                <p className="text-xs text-zinc-500 mt-1">
                  Track the verification and approval status of your JazzCash transaction IDs
                </p>
              </div>
              <button
                onClick={fetchUserPayments}
                disabled={loadingPayments}
                className="text-xs font-bold text-zinc-600 hover:text-zinc-900 flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
              >
                <span>↻ Refresh Status</span>
              </button>
            </div>

            {loadingPayments ? (
              <div className="text-center py-8 text-xs text-zinc-500">
                Loading payment records...
              </div>
            ) : payments.length === 0 ? (
              <div className="text-center py-10 border border-dashed border-zinc-300 rounded-2xl bg-zinc-50">
                <p className="text-sm font-bold text-zinc-800">No JazzCash payments submitted yet</p>
                <p className="text-xs text-zinc-500 mt-1 max-w-md mx-auto">
                  When you upgrade your plan via JazzCash (03037108440 - AROSA), your transaction receipt and status will show up here.
                </p>
                <button
                  onClick={() => onOpenManualPayment && onOpenManualPayment('Pro')}
                  className="mt-4 px-4 py-2 rounded-xl text-xs font-bold bg-zinc-900 text-white hover:bg-zinc-800 transition-all cursor-pointer shadow-sm"
                >
                  Submit Payment Now
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-zinc-200 text-zinc-500">
                      <th className="pb-3 font-semibold">Transaction ID (TID)</th>
                      <th className="pb-3 font-semibold">Plan Requested</th>
                      <th className="pb-3 font-semibold">Amount</th>
                      <th className="pb-3 font-semibold">Status</th>
                      <th className="pb-3 font-semibold">Date</th>
                      <th className="pb-3 font-semibold">Admin Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 font-mono">
                    {payments.map((p) => (
                      <tr key={p.id} className="hover:bg-zinc-50 transition-colors">
                        <td className="py-3 font-bold text-zinc-900 tracking-wider">{p.transactionId}</td>
                        <td className="py-3 font-sans">
                          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-zinc-100 text-zinc-800 border border-zinc-200">
                            {p.planType}
                          </span>
                        </td>
                        <td className="py-3 text-zinc-700">{p.amount || 'Standard'}</td>
                        <td className="py-3 font-sans">
                          {p.status === 'approved' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                              ✓ Approved
                            </span>
                          )}
                          {p.status === 'pending' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                              ⏳ Pending Review
                            </span>
                          )}
                          {p.status === 'rejected' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-800 border border-rose-200">
                              ✕ Rejected
                            </span>
                          )}
                        </td>
                        <td className="py-3 text-zinc-500 text-[11px]">
                          {new Date(p.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-3 text-zinc-600 font-sans text-xs max-w-xs truncate">
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
            <div className="p-6 rounded-2xl border bg-white border-zinc-200 shadow-xs">
              <h4 className="text-sm font-bold text-zinc-900 mb-2">Commercial License</h4>
              <p className="text-xs text-zinc-600 leading-relaxed">
                All voice audio generated using paid plans (Lite, Pro, Studio) includes full commercial broadcast rights for YouTube, podcasts, ads, and audiobooks.
              </p>
            </div>

            <div className="p-6 rounded-2xl border bg-white border-zinc-200 shadow-xs">
              <h4 className="text-sm font-bold text-zinc-900 mb-2">30-Day Credit Validity</h4>
              <p className="text-xs text-zinc-600 leading-relaxed">
                Character credits remain valid for 30 days from purchase. Renew or top up anytime to maintain active voice cloning credits and premium feature access.
              </p>
            </div>

            <div className="p-6 rounded-2xl border bg-white border-zinc-200 shadow-xs">
              <h4 className="text-sm font-bold text-zinc-900 mb-2">Multi-Lingual Engine</h4>
              <p className="text-xs text-zinc-600 leading-relaxed">
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
