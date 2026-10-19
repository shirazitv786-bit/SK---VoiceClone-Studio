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

const DEFAULT_PLANS_TEMPLATE = [
  {
    id: 'Free',
    name: 'Free',
    priceMonthly: 0,
    priceAnnual: 0,
    pricePKR: 'PKR 0',
    displayPrice: 'FREE',
    credits: '2,000 credits',
    creditCount: 2000,
    badge: '',
    desc: 'Start your journey with our free plan - perfect for getting started with basic voice generation.',
    features: [
      'Community support',
      'MP3 download format',
      'Standard audio quality',
      'Basic voice selection',
      'Max 2,500 characters per conversion'
    ],
    buttonText: 'Get Started Free',
    highlight: false,
    maxCharsPerGen: 2500,
    customVoicesCount: 0,
    maxQueuedTasks: 1,
    isEnabled: true
  },
  {
    id: 'Lite',
    name: 'Lite',
    priceMonthly: 10,
    priceAnnual: 8,
    pricePKR: 'PKR 2,800',
    displayPrice: '$10.00',
    credits: '500,000 credits',
    creditCount: 500000,
    badge: '',
    desc: 'Ideal for casual creators, audio hobbyists, and regular voiceover projects.',
    features: [
      'Unlimited Downloads & 1 month of conversion history',
      'Maximum 5,000 characters per generation',
      '5 cloned reference voice credits',
      'Max 1 Queued Tasks',
      'Access to V2 (Multilingual) Voice Cloning Models',
      '500,000 characters per month (approx. 9 hours of audio)'
    ],
    buttonText: 'Subscribe to Lite',
    highlight: false,
    maxCharsPerGen: 5000,
    customVoicesCount: 5,
    maxQueuedTasks: 1,
    isEnabled: true
  },
  {
    id: 'Pro',
    name: 'Pro',
    priceMonthly: 17,
    priceAnnual: 13.6,
    pricePKR: 'PKR 4,750',
    displayPrice: '$17.00',
    credits: '1,000,000 credits',
    creditCount: 1000000,
    badge: 'Most Popular',
    desc: 'Built for pro content creators, video editors, podcasters, and growing channels.',
    features: [
      'Priority 36h Customer Support',
      'Unlimited Downloads & 1 month of conversion history',
      'Maximum 6,000 characters per regular conversion',
      '15 cloned reference voice credits',
      '60+ AI voices and 6+ languages',
      'Max 3 queued tasks',
      'Access to V2 (Multilingual) Voice Cloning Models',
      '1,000,000 total characters per month (approximately 20.4 hours of audio)'
    ],
    buttonText: 'Upgrade to Pro',
    highlight: true,
    maxCharsPerGen: 6000,
    customVoicesCount: 15,
    maxQueuedTasks: 3,
    isEnabled: true
  },
  {
    id: 'Studio',
    name: 'Studio',
    priceMonthly: 24,
    priceAnnual: 19.2,
    pricePKR: 'PKR 6,700',
    displayPrice: '$24.00',
    credits: '3,000,000 credits',
    creditCount: 3000000,
    badge: 'Best Value',
    desc: 'Perfect for content creators, agencies, game developers, and businesses.',
    features: [
      'Priority 24h Email Support',
      'Unlimited Downloads & 1 month of conversion history',
      'Maximum 7,000 characters per regular generation',
      '30 cloned reference voice credits',
      '60+ AI voices and 6+ languages',
      'Max 4 queued tasks',
      'Access to V2 (Multilingual) + V3 (Turbo) Voice Cloning Models',
      '3,000,000 characters per month (approximately 45 hours of audio)'
    ],
    buttonText: 'Get Studio Pass',
    highlight: false,
    maxCharsPerGen: 7000,
    customVoicesCount: 30,
    maxQueuedTasks: 4,
    isEnabled: true
  }
];

export default function AdminDashboard({ user, onNavigate }) {
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'payments' | 'users' | 'generations' | 'plans' | 'settings' | 'security'
  const [loading, setLoading] = useState(true);

  // Overview Stats
  const [overview, setOverview] = useState(null);

  // Subscription & Pricing Plans Management
  const [plansList, setPlansList] = useState(DEFAULT_PLANS_TEMPLATE);
  const [plansLoading, setPlansLoading] = useState(false);
  const [plansSaving, setPlansSaving] = useState(false);
  const [plansFeedback, setPlansFeedback] = useState(null);
  const [selectedPlanId, setSelectedPlanId] = useState('Pro');

  // User Management
  const [users, setUsers] = useState([]);
  const [userSearch, setUserSearch] = useState('');
  const [userPlanFilter, setUserPlanFilter] = useState('all');
  const [userRoleFilter, setUserRoleFilter] = useState('all');
  const [userStatusFilter, setUserStatusFilter] = useState('all');

  // Edit User Modal
  const [editingUser, setEditingUser] = useState(null);
  const [editPlan, setEditPlan] = useState('Free');
  const [editCredits, setEditCredits] = useState(2000);
  const [editRole, setEditRole] = useState('user');
  const [editStatus, setEditStatus] = useState('active');
  const [editSaving, setEditSaving] = useState(false);

  // Platform Generations
  const [generations, setGenerations] = useState([]);
  const [genSearch, setGenSearch] = useState('');

  // System Settings
  const [settings, setSettings] = useState({
    free_tier_credits: '2000',
    maintenance_mode: 'false',
    announcement_banner: 'Welcome to SK - VoiceClone Studio! Commercial Neural TTS is live.',
    max_script_length_free: '2500',
    max_script_length_paid: '15000'
  });
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsFeedback, setSettingsFeedback] = useState(null);

  // Storage Cleanup
  const [cleanupHours, setCleanupHours] = useState('24');
  const [cleaningUp, setCleaningUp] = useState(false);
  const [cleanupMessage, setCleanupMessage] = useState(null);

  // JazzCash Manual Payments
  const [payments, setPayments] = useState([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('all'); // 'all' | 'pending' | 'approved' | 'rejected'
  const [pendingPaymentsCount, setPendingPaymentsCount] = useState(0);
  const [actionProcessingId, setActionProcessingId] = useState(null);
  const [actionFeedback, setActionFeedback] = useState(null);
  const [previewScreenshotUrl, setPreviewScreenshotUrl] = useState(null);

  useEffect(() => {
    fetchOverview();
    fetchUsers();
    fetchGenerations();
    fetchSettings();
    fetchPayments();
    fetchPlansList();
  }, []);

  const fetchOverview = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/admin/overview`);
      if (res.data && res.data.success) {
        setOverview(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch admin overview:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAdminOverview = async () => {
    setLoading(true);
    await Promise.allSettled([
      fetchOverview(),
      fetchUsers(),
      fetchGenerations(),
      fetchSettings(),
      fetchPayments(),
      fetchPlansList()
    ]);
    setLoading(false);
  };

  // Fetch Dynamic Subscription Plans
  const fetchPlansList = async () => {
    setPlansLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/api/admin/plans`);
      if (res.data && res.data.success && Array.isArray(res.data.plans) && res.data.plans.length > 0) {
        setPlansList(res.data.plans);
        if (!selectedPlanId && res.data.plans.length > 0) {
          setSelectedPlanId(res.data.plans[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to fetch subscription plans:', err);
    } finally {
      setPlansLoading(false);
    }
  };

  // Save All Plans Configuration to Database
  const handleSaveAllPlans = async (plansToSave = plansList) => {
    setPlansSaving(true);
    setPlansFeedback(null);
    try {
      const res = await axios.post(`${API_BASE}/api/admin/plans`, { plans: plansToSave });
      if (res.data && res.data.success) {
        setPlansList(res.data.plans);
        setPlansFeedback({
          type: 'success',
          text: `All ${res.data.plans.length} subscription packages saved successfully! Dynamic rates & quotas active.`
        });
        try {
          window.dispatchEvent(new CustomEvent('sk-plans-updated', { detail: res.data.plans }));
          localStorage.setItem('sk_dynamic_plans_cache', JSON.stringify(res.data.plans));
        } catch (e) {}
      }
    } catch (err) {
      setPlansFeedback({
        type: 'error',
        text: err.response?.data?.error || 'Failed to save subscription plans.'
      });
    } finally {
      setPlansSaving(false);
    }
  };

  // Update a single field in a plan
  const updatePlanField = (planId, field, value) => {
    setPlansList(prev => prev.map(p => {
      if (p.id !== planId) return p;
      return { ...p, [field]: value };
    }));
  };

  // Feature Bullet Point Handlers
  const updatePlanFeature = (planId, featureIdx, newText) => {
    setPlansList(prev => prev.map(p => {
      if (p.id !== planId) return p;
      const newFeatures = [...(p.features || [])];
      newFeatures[featureIdx] = newText;
      return { ...p, features: newFeatures };
    }));
  };

  const addPlanFeature = (planId) => {
    setPlansList(prev => prev.map(p => {
      if (p.id !== planId) return p;
      return { ...p, features: [...(p.features || []), 'New feature bullet point'] };
    }));
  };

  const removePlanFeature = (planId, featureIdx) => {
    setPlansList(prev => prev.map(p => {
      if (p.id !== planId) return p;
      const newFeatures = (p.features || []).filter((_, idx) => idx !== featureIdx);
      return { ...p, features: newFeatures };
    }));
  };

  // Add a new plan tier
  const handleAddNewPlan = () => {
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    const newId = `Tier_${randomSuffix}`;
    const newPlan = {
      id: newId,
      name: 'Custom Tier',
      priceMonthly: 35,
      priceAnnual: 28,
      pricePKR: 'PKR 9,800',
      displayPrice: '$35.00',
      credits: '5,000,000 credits',
      creditCount: 5000000,
      badge: 'New',
      desc: 'High-performance commercial subscription package with priority voice generation.',
      features: [
        'Unlimited Downloads & permanent conversion history',
        'Maximum 8,000 characters per conversion',
        '50 cloned reference voice credits',
        'Commercial broadcast rights included',
        'Priority Neural Engine Processing Queue'
      ],
      buttonText: 'Get Custom Pass',
      highlight: false,
      maxCharsPerGen: 8000,
      customVoicesCount: 50,
      maxQueuedTasks: 5,
      isEnabled: true
    };
    setPlansList(prev => [...prev, newPlan]);
    setSelectedPlanId(newId);
  };

  // Delete plan tier
  const handleDeletePlan = (planId) => {
    if (plansList.length <= 1) {
      alert('You must maintain at least one subscription plan.');
      return;
    }
    if (!window.confirm(`Are you sure you want to delete the plan "${planId}"? Users will no longer be able to select it.`)) {
      return;
    }
    const updated = plansList.filter(p => p.id !== planId);
    setPlansList(updated);
    if (selectedPlanId === planId) {
      setSelectedPlanId(updated[0]?.id || null);
    }
  };

  // Reset all plans to system defaults
  const handleResetPlansToDefaults = () => {
    if (!window.confirm('Reset all plans back to system defaults (Free, Lite, Pro, Studio)? Any customized prices or quotas will be restored.')) {
      return;
    }
    handleSaveAllPlans(DEFAULT_PLANS_TEMPLATE);
  };

  const fetchUsers = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/admin/users`, {
        params: {
          search: userSearch,
          plan: userPlanFilter,
          role: userRoleFilter,
          status: userStatusFilter
        }
      });
      if (res.data && res.data.success) {
        setUsers(res.data.users || []);
      }
    } catch (err) {
      console.error('Failed to fetch users:', err);
    }
  };

  const fetchGenerations = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/admin/generations`, {
        params: { search: genSearch }
      });
      if (res.data && res.data.success) {
        setGenerations(res.data.generations || []);
      }
    } catch (err) {
      console.error('Failed to fetch platform generations:', err);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/admin/settings`);
      if (res.data && res.data.success && res.data.settings) {
        setSettings(prev => ({ ...prev, ...res.data.settings }));
      }
    } catch (err) {
      console.error('Failed to fetch settings:', err);
    }
  };

  const fetchPayments = async () => {
    setPaymentsLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/api/admin/manual-payments`, {
        params: { status: paymentStatusFilter }
      });
      if (res.data && res.data.success) {
        setPayments(res.data.payments || []);
        if (typeof res.data.pendingCount === 'number') {
          setPendingPaymentsCount(res.data.pendingCount);
        }
      }
    } catch (err) {
      console.error('Failed to fetch admin manual payments:', err);
    } finally {
      setPaymentsLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, [paymentStatusFilter]);

  // Approve JazzCash Payment
  const handleApprovePayment = async (paymentId) => {
    if (!window.confirm('Are you sure you want to approve this payment? This will immediately update the payment status to approved and automatically credit the user plan & characters.')) return;

    setActionProcessingId(paymentId);
    setActionFeedback(null);
    try {
      const res = await axios.post(`${API_BASE}/api/admin/manual-payments/${paymentId}/approve`, {});
      if (res.data && res.data.success) {
        setActionFeedback({ type: 'success', text: res.data.message || 'Payment successfully approved!' });
        await fetchPayments();
        await fetchUsers();
        try {
          window.dispatchEvent(new CustomEvent('sk-user-updated'));
          window.dispatchEvent(new CustomEvent('sk-plans-updated'));
        } catch (e) {}
      }
    } catch (err) {
      setActionFeedback({ type: 'error', text: err.response?.data?.error || 'Failed to approve payment.' });
    } finally {
      setActionProcessingId(null);
    }
  };

  // Reject JazzCash Payment
  const handleRejectPayment = async (paymentId) => {
    const reason = window.prompt('Enter reason for rejection (e.g. Invalid Transaction ID, Duplicate TID, Screenshot illegible):', 'Transaction ID not verified or receipt invalid');
    if (reason === null) return;

    setActionProcessingId(paymentId);
    setActionFeedback(null);
    try {
      const res = await axios.post(`${API_BASE}/api/admin/manual-payments/${paymentId}/reject`, { reason });
      if (res.data && res.data.success) {
        setActionFeedback({ type: 'success', text: res.data.message || 'Payment marked as rejected.' });
        await fetchPayments();
      }
    } catch (err) {
      setActionFeedback({ type: 'error', text: err.response?.data?.error || 'Failed to reject payment.' });
    } finally {
      setActionProcessingId(null);
    }
  };

  // Save Settings
  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSettingsSaving(true);
    setSettingsFeedback(null);
    try {
      const res = await axios.post(`${API_BASE}/api/admin/settings`, { settings });
      if (res.data && res.data.success) {
        setSettingsFeedback({ type: 'success', text: 'System settings updated successfully in database!' });
      }
    } catch (err) {
      setSettingsFeedback({ type: 'error', text: err.response?.data?.error || 'Failed to save settings.' });
    } finally {
      setSettingsSaving(false);
    }
  };

  // Open Edit User Modal
  const handleOpenEditUser = (u) => {
    setEditingUser(u);
    setEditPlan(u.plan || 'Free');
    setEditCredits(u.credits || 0);
    setEditRole(u.role || 'user');
    setEditStatus(u.status || 'active');
  };

  // Save Edited User
  const handleSaveUser = async (e) => {
    e.preventDefault();
    if (!editingUser) return;
    setEditSaving(true);

    try {
      const res = await axios.put(`${API_BASE}/api/admin/users/${editingUser.id}`, {
        plan: editPlan,
        credits: parseInt(editCredits, 10),
        role: editRole,
        status: editStatus
      });

      if (res.data && res.data.success) {
        setUsers(prev => prev.map(u => u.id === editingUser.id ? { ...u, ...res.data.user } : u));
        setEditingUser(null);
        fetchOverview();
        try {
          window.dispatchEvent(new CustomEvent('sk-user-updated', { detail: res.data.user }));
        } catch (e) {}
      }
    } catch (err) {
      alert('Failed to update user: ' + (err.response?.data?.error || err.message));
    } finally {
      setEditSaving(false);
    }
  };

  // Delete User
  const handleDeleteUser = async (targetUser) => {
    if (!window.confirm(`Are you sure you want to PERMANENTLY delete user ${targetUser.email}? This action cannot be undone.`)) {
      return;
    }

    try {
      const res = await axios.delete(`${API_BASE}/api/admin/users/${targetUser.id}`);
      if (res.data && res.data.success) {
        setUsers(prev => prev.filter(u => u.id !== targetUser.id));
        fetchOverview();
      }
    } catch (err) {
      alert('Delete failed: ' + (err.response?.data?.error || err.message));
    }
  };

  // Delete Generation
  const handleDeleteGeneration = async (genId) => {
    if (!window.confirm('Delete this generation record and audio file from disk?')) return;

    try {
      const res = await axios.delete(`${API_BASE}/api/admin/generations/${genId}`);
      if (res.data && res.data.success) {
        setGenerations(prev => prev.filter(g => g.id !== genId));
        fetchOverview();
      }
    } catch (err) {
      alert('Failed to delete generation: ' + (err.response?.data?.error || err.message));
    }
  };

  // Clean Audio Storage
  const handleCleanupStorage = async (all = false) => {
    setCleaningUp(true);
    setCleanupMessage(null);
    try {
      const res = await axios.post(`${API_BASE}/api/admin/cleanup-storage`, {
        all,
        olderThanHours: cleanupHours
      });
      if (res.data && res.data.success) {
        setCleanupMessage({ type: 'success', text: res.data.message });
        fetchOverview();
      }
    } catch (err) {
      setCleanupMessage({ type: 'error', text: err.response?.data?.error || 'Cleanup failed.' });
    } finally {
      setCleaningUp(false);
    }
  };

  // Access check
  if (!user || (user.role !== 'admin' && user.role !== 'superadmin')) {
    return (
      <div className="w-full max-w-4xl mx-auto px-4 py-20 text-center text-zinc-100">
        <div className="p-8 rounded-3xl border bg-[#121215] border-zinc-800 shadow-2xl">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center justify-center mx-auto mb-4">
            <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Administrative Privileges Required</h2>
          <p className="text-xs text-zinc-400 mb-6 max-w-md mx-auto">
            You are signed in as <span className="font-mono text-white">{user?.email}</span> (role: {user?.role || 'user'}). Only accounts with Admin or Superadmin role can access this console.
          </p>
          <button
            onClick={() => onNavigate('dashboard')}
            className="px-5 py-2.5 rounded-xl text-xs font-bold bg-white text-black hover:bg-zinc-200"
          >
            Return to User Dashboard
          </button>
        </div>
      </div>
    );
  }

  const stats = overview?.stats || {
    totalUsers: users.length,
    activeUsers: users.filter(u => u.status === 'active').length,
    suspendedUsers: users.filter(u => u.status === 'suspended').length,
    totalGenerations: 0,
    totalCharsSynthesized: 0,
    totalCreditsInCirculation: 0,
    audioFilesCount: 0,
    audioStorageMb: '0.00'
  };

  const adminNavTabs = [
    {
      id: 'overview',
      label: 'Platform Metrics & Health',
      desc: 'System status, traffic analytics, audio storage & database health',
      icon: (
        <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      )
    },
    {
      id: 'payments',
      label: 'JazzCash Payments',
      desc: 'Verify transaction receipts, approve plans & credit balances',
      badge: pendingPaymentsCount > 0 ? `${pendingPaymentsCount} Pending` : `${payments.length}`,
      isAlert: pendingPaymentsCount > 0,
      icon: (
        <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      )
    },
    {
      id: 'users',
      label: 'User Management',
      desc: 'Direct database account controls, credit overrides & roles',
      badge: `${users.length}`,
      icon: (
        <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      )
    },
    {
      id: 'generations',
      label: 'Platform Audio Log',
      desc: 'System-wide speech synthesis records, parameters & cleanup audit',
      badge: `${generations.length}`,
      icon: (
        <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 100-6 3 3 0 000 6z" />
        </svg>
      )
    },
    {
      id: 'plans',
      label: 'Pricing Plans & Packages',
      desc: 'Edit pricing tiers, quotas, PKR rates, badges & feature lists',
      badge: `${plansList.length} Tiers`,
      icon: (
        <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
      )
    },
    {
      id: 'settings',
      label: 'Global Site Settings',
      desc: 'Platform-wide defaults, free tier limits & engine options',
      icon: (
        <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        </svg>
      )
    },
    {
      id: 'security',
      label: 'Superadmin Credentials',
      desc: 'Environment secrets (.env) and cryptographic token access',
      icon: (
        <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
        </svg>
      )
    }
  ];

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 animate-fadeIn text-zinc-100">
      <div className="flex flex-col lg:flex-row items-start gap-8">
        {/* ===== ASIDE BAR (SIDEBAR) ===== */}
        <aside className="w-full lg:w-72 shrink-0 space-y-6 lg:sticky lg:top-24">
          {/* Admin Identity Card (NO PRO PILLS IN TITLE SECTION) */}
          <div className="p-5 rounded-3xl border bg-[#121215] border-zinc-800 shadow-xl relative overflow-hidden">
            <div className="flex items-center gap-3.5 mb-3">
              <div className="w-12 h-12 rounded-2xl bg-white text-black font-extrabold text-2xl flex items-center justify-center shrink-0 shadow-md shadow-white/5 border border-zinc-200">
                🛡️
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-base font-extrabold text-white truncate leading-tight">
                  Admin Console
                </h1>
                <p className="text-xs text-zinc-400 font-mono truncate mt-0.5">
                  {user.email}
                </p>
                <div className="flex items-center gap-1.5 text-[11px] font-mono text-emerald-400 mt-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>Railway PostgreSQL</span>
                </div>
              </div>
            </div>

            {/* Quick Action Navigation in Admin Card */}
            <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-zinc-800/80">
              <button
                onClick={() => onNavigate('dashboard')}
                className="w-full py-2 px-3 rounded-xl text-xs font-bold bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
              >
                <span>← User View</span>
              </button>
              <button
                onClick={() => onNavigate('studio')}
                className="w-full py-2 px-3 rounded-xl text-xs font-bold bg-white text-black hover:bg-zinc-200 transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-95 cursor-pointer"
              >
                <span>Studio</span>
              </button>
            </div>
          </div>

          {/* Navigation Sections in Aside Bar */}
          <div className="p-2 sm:p-2.5 rounded-3xl border bg-[#121215] border-zinc-800 shadow-xl space-y-1">
            <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-zinc-500 font-mono">
              Control Sections
            </div>
            <nav className="flex lg:flex-col gap-1.5 overflow-x-auto lg:overflow-visible pb-1 lg:pb-0 no-scrollbar">
              {adminNavTabs.map((tab) => {
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
                    {tab.badge && (
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ml-2 ${
                        tab.isAlert
                          ? 'bg-amber-400 text-black font-extrabold animate-pulse'
                          : isActive
                          ? 'bg-black text-white'
                          : 'bg-zinc-800 text-zinc-300'
                      }`}>
                        {tab.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* System & Storage Diagnostics Widget in Aside Bar */}
          <div className="p-5 rounded-3xl border bg-gradient-to-b from-[#141418] to-[#0c0c0e] border-zinc-800 shadow-lg space-y-3">
            <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 font-mono">
              System Telemetry
            </div>
            <div className="space-y-2 text-xs font-mono">
              <div className="flex items-center justify-between text-zinc-400">
                <span>Database:</span>
                <span className="text-emerald-400 font-bold">PostgreSQL Active</span>
              </div>
              <div className="flex items-center justify-between text-zinc-400">
                <span>Cleanup Cron:</span>
                <span className="text-zinc-200">24h Auto-Purge</span>
              </div>
              <div className="flex items-center justify-between text-zinc-400">
                <span>Audio on Disk:</span>
                <span className="text-white font-bold">{stats.audioStorageMb} MB</span>
              </div>
            </div>
          </div>
        </aside>

        {/* ===== MAIN CONTENT AREA ===== */}
        <main className="flex-1 w-full min-w-0 space-y-6">
          {/* Main Content Header Banner for Active Section */}
          <div className="p-5 sm:p-6 rounded-3xl border bg-[#121215] border-zinc-800 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-mono text-zinc-500 uppercase tracking-wider mb-1">
                <span>Superadmin Console</span>
                <span>/</span>
                <span className="text-zinc-300 font-bold">{adminNavTabs.find(t => t.id === activeTab)?.label}</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                {adminNavTabs.find(t => t.id === activeTab)?.label}
              </h2>
              <p className="text-xs text-zinc-400 mt-1">
                {adminNavTabs.find(t => t.id === activeTab)?.desc}
              </p>
            </div>
            <div className="flex items-center gap-2.5">
              <button
                onClick={fetchAdminOverview}
                disabled={loading}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                <span>↻ Refresh Platform</span>
              </button>
            </div>
          </div>

      {/* TAB 1: OVERVIEW & HEALTH */}
      {activeTab === 'overview' && (
        <div className="space-y-8">
          {/* KPI Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            <div className="p-6 rounded-2xl border bg-[#121215] border-zinc-800 shadow-md">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Total Registered Users</span>
              <div className="text-3xl font-extrabold font-mono text-white mt-1">{stats.totalUsers}</div>
              <div className="flex items-center gap-3 text-[11px] text-zinc-400 mt-2 font-mono">
                <span className="text-emerald-400">● {stats.activeUsers} active</span>
                <span>•</span>
                <span className="text-rose-400">● {stats.suspendedUsers} suspended</span>
              </div>
            </div>

            <div className="p-6 rounded-2xl border bg-[#121215] border-zinc-800 shadow-md">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Total Generations Created</span>
              <div className="text-3xl font-extrabold font-mono text-white mt-1">{stats.totalGenerations}</div>
              <p className="text-[11px] text-zinc-400 mt-2 font-mono">
                {(stats.totalCharsSynthesized || 0).toLocaleString()} characters voiced
              </p>
            </div>

            <div className="p-6 rounded-2xl border bg-[#121215] border-zinc-800 shadow-md">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Credits in Circulation</span>
              <div className="text-3xl font-extrabold font-mono text-white mt-1">
                ⚡ {(stats.totalCreditsInCirculation || 0).toLocaleString()}
              </div>
              <p className="text-[11px] text-zinc-400 mt-2 font-mono">Across all user accounts</p>
            </div>

            <div className="p-6 rounded-2xl border bg-[#121215] border-zinc-800 shadow-md">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Audio Storage on Disk</span>
              <div className="text-3xl font-extrabold font-mono text-white mt-1">
                {stats.audioStorageMb} MB
              </div>
              <p className="text-[11px] text-zinc-400 mt-2 font-mono">
                {stats.audioFilesCount} generated audio file(s)
              </p>
            </div>

            <div className="p-6 rounded-2xl border bg-[#121215] border-zinc-800 shadow-md">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">PostgreSQL Status</span>
              <div className="text-2xl font-extrabold text-emerald-400 mt-1 flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></span>
                Connected
              </div>
              <p className="text-[11px] text-zinc-400 mt-2 font-mono">Railway TCP Proxy Active</p>
            </div>

            <div className="p-6 rounded-2xl border bg-[#121215] border-zinc-800 shadow-md">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">TTS Neural Daemon</span>
              <div className="text-2xl font-extrabold text-white mt-1 flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                120 Voices Ready
              </div>
              <p className="text-[11px] text-zinc-400 mt-2 font-mono">Coqui XTTS-v2 & Edge Warm Worker</p>
            </div>
          </div>

          {/* Disk Storage Management Card */}
          <div className="p-6 rounded-3xl border bg-[#121215] border-zinc-800 shadow-xl">
            <h3 className="text-base font-bold text-white mb-1">Server Storage & Audio Cleanup</h3>
            <p className="text-xs text-zinc-400 mb-4">Safely purge old generated audio files from the disk to preserve Railway space</p>

            {cleanupMessage && (
              <div className={`mb-4 p-3 rounded-xl text-xs font-semibold ${
                cleanupMessage.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400'
              }`}>
                {cleanupMessage.text}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs text-zinc-400">Delete audio older than:</span>
              <select
                value={cleanupHours}
                onChange={(e) => setCleanupHours(e.target.value)}
                className="px-3 py-2 rounded-xl text-xs bg-zinc-900 border border-zinc-700 text-white"
              >
                <option value="1">1 hour</option>
                <option value="12">12 hours</option>
                <option value="24">24 hours</option>
                <option value="72">3 days</option>
                <option value="168">7 days</option>
              </select>
              <button
                onClick={() => handleCleanupStorage(false)}
                disabled={cleaningUp}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700 cursor-pointer disabled:opacity-50"
              >
                {cleaningUp ? 'Purging...' : `Purge Audio Older than ${cleanupHours}h`}
              </button>
              <button
                onClick={() => {
                  if (window.confirm('Delete ALL generated audio files from disk?')) {
                    handleCleanupStorage(true);
                  }
                }}
                disabled={cleaningUp}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 cursor-pointer disabled:opacity-50"
              >
                Purge All Audio
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: USER MANAGEMENT */}
      {activeTab === 'users' && (
        <div className="space-y-6">
          {/* Search & Filters */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-2xl border bg-[#121215] border-zinc-800">
            <div className="w-full md:w-72">
              <input
                type="text"
                placeholder="Search by name or email..."
                value={userSearch}
                onChange={(e) => {
                  setUserSearch(e.target.value);
                  setTimeout(fetchUsers, 200);
                }}
                className="w-full px-3.5 py-2 rounded-xl border text-xs bg-zinc-900 border-zinc-800 text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs">
              <div>
                <label className="text-[11px] text-zinc-400 mr-2">Plan:</label>
                <select
                  value={userPlanFilter}
                  onChange={(e) => {
                    setUserPlanFilter(e.target.value);
                    setTimeout(fetchUsers, 100);
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-700 text-white"
                >
                  <option value="all">All Plans</option>
                  <option value="Free">Free</option>
                  <option value="Lite">Lite</option>
                  <option value="Pro">Pro</option>
                  <option value="Studio">Studio</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] text-zinc-400 mr-2">Role:</label>
                <select
                  value={userRoleFilter}
                  onChange={(e) => {
                    setUserRoleFilter(e.target.value);
                    setTimeout(fetchUsers, 100);
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-700 text-white"
                >
                  <option value="all">All Roles</option>
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                  <option value="superadmin">Superadmin</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] text-zinc-400 mr-2">Status:</label>
                <select
                  value={userStatusFilter}
                  onChange={(e) => {
                    setUserStatusFilter(e.target.value);
                    setTimeout(fetchUsers, 100);
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-700 text-white"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>
            </div>
          </div>

          {/* Users Table */}
          <div className="rounded-3xl border bg-[#121215] border-zinc-800 overflow-x-auto shadow-xl">
            <table className="w-full text-left text-xs text-zinc-200">
              <thead className="border-b border-zinc-800 bg-zinc-900/70 text-[11px] uppercase tracking-wider text-zinc-400">
                <tr>
                  <th className="px-5 py-3.5">User</th>
                  <th className="px-5 py-3.5">Plan</th>
                  <th className="px-5 py-3.5">Credits</th>
                  <th className="px-5 py-3.5">Role</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5">Generations</th>
                  <th className="px-5 py-3.5">Registered</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 font-mono">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-zinc-900/40 transition-colors">
                    <td className="px-5 py-4">
                      <div className="font-sans font-bold text-white">{u.name}</div>
                      <div className="text-[11px] text-zinc-400">{u.email}</div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-700 text-white font-bold text-[10px] uppercase">
                        {u.plan}
                      </span>
                    </td>
                    <td className="px-5 py-4 font-bold text-white">
                      ⚡ {u.credits?.toLocaleString()}
                    </td>
                    <td className="px-5 py-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        u.role === 'superadmin' ? 'bg-white text-black' : u.role === 'admin' ? 'bg-zinc-700 text-white' : 'bg-zinc-900 text-zinc-400 border border-zinc-800'
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        u.status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      }`}>
                        {u.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-zinc-400">
                      {u._count?.generations || 0}
                    </td>
                    <td className="px-5 py-4 text-[11px] text-zinc-400">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 font-sans">
                        <button
                          onClick={() => handleOpenEditUser(u)}
                          className="px-2.5 py-1 rounded-lg border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold cursor-pointer"
                        >
                          Edit
                        </button>
                        {u.role !== 'superadmin' && (
                          <button
                            onClick={() => handleDeleteUser(u)}
                            className="px-2.5 py-1 rounded-lg border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-semibold cursor-pointer"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: PLATFORM GENERATIONS */}
      {activeTab === 'generations' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-white">Platform Generation Moderation</h2>
              <p className="text-xs text-zinc-400">Review all voice clips generated across the platform</p>
            </div>
            <div className="w-full sm:w-72">
              <input
                type="text"
                placeholder="Search by prompt or voice..."
                value={genSearch}
                onChange={(e) => {
                  setGenSearch(e.target.value);
                  setTimeout(fetchGenerations, 200);
                }}
                className="w-full px-3.5 py-2 rounded-xl border text-xs bg-zinc-900 border-zinc-800 text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
              />
            </div>
          </div>

          <div className="space-y-3">
            {generations.map((g) => (
              <div key={g.id} className="p-4 rounded-2xl border bg-[#121215] border-zinc-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-semibold text-white leading-relaxed">{g.text}</p>
                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-zinc-400 mt-2 font-mono">
                    <span className="text-white">User: {g.user?.email || g.deviceId || 'Guest'}</span>
                    <span>•</span>
                    <span className="text-zinc-300">🎙️ {g.referenceVoice}</span>
                    <span>•</span>
                    <span>{g.charsUsed} chars</span>
                    <span>•</span>
                    <span>{new Date(g.createdAt).toLocaleString()}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {g.audioUrl && (
                    <audio
                      controls
                      crossOrigin="anonymous"
                      preload="metadata"
                      src={resolveAudioUrl(g.audioUrl)}
                      className="h-9 max-w-[220px]"
                    />
                  )}
                  <a
                    href={resolveAudioUrl(g.audioUrl)}
                    download
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 rounded-xl border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-white"
                  >
                    <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                  </a>
                  <button
                    onClick={() => handleDeleteGeneration(g.id)}
                    className="p-2 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 cursor-pointer"
                    title="Delete record & audio file"
                  >
                    <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: GLOBAL SITE SETTINGS */}
      {activeTab === 'settings' && (
        <div className="max-w-3xl">
          <div className="p-6 sm:p-8 rounded-3xl border bg-[#121215] border-zinc-800 shadow-xl">
            <h3 className="text-base font-bold text-white mb-1">Global Site & Platform Settings</h3>
            <p className="text-xs text-zinc-400 mb-6">These parameters apply dynamically across the application</p>

            {settingsFeedback && (
              <div className={`mb-4 p-3 rounded-xl text-xs font-semibold ${
                settingsFeedback.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400'
              }`}>
                {settingsFeedback.text}
              </div>
            )}

            {/* Quick Link Banner to Full Plans Editor */}
            <div className="mb-6 p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-purple-950/40 via-zinc-900 to-zinc-900 border border-purple-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg">
              <div>
                <div className="flex items-center gap-2 text-purple-400 text-xs font-bold uppercase tracking-wider mb-1">
                  <span>💳 Subscription Packages</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 border border-purple-500/30 font-mono">
                    {plansList.length} Active Tiers
                  </span>
                </div>
                <h4 className="text-sm font-extrabold text-white">
                  Pricing Plans, Quotas & Features
                </h4>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Configure monthly prices, PKR rates, character allocations, marketing badges & feature lists.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('plans')}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-white text-black hover:bg-zinc-200 transition-all shrink-0 cursor-pointer flex items-center justify-center gap-1.5 shadow-md active:scale-95"
              >
                <span>Edit All Plans & Pricing →</span>
              </button>
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1.5">
                  Free Starter Credits Allotment (New Signups)
                </label>
                <input
                  type="number"
                  value={settings.free_tier_credits || '2000'}
                  onChange={(e) => setSettings({ ...settings, free_tier_credits: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border text-xs bg-zinc-900 border-zinc-800 text-white font-mono focus:outline-none focus:border-zinc-500"
                />
                <span className="text-[11px] text-zinc-500 mt-1 block">Default: 2,000 characters for new registrations.</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1.5">
                  Global Announcement Banner Notice
                </label>
                <input
                  type="text"
                  value={settings.announcement_banner || ''}
                  onChange={(e) => setSettings({ ...settings, announcement_banner: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border text-xs bg-zinc-900 border-zinc-800 text-white focus:outline-none focus:border-zinc-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1.5">
                    Max Script Length (Free Plan)
                  </label>
                  <input
                    type="number"
                    value={settings.max_script_length_free || '2500'}
                    onChange={(e) => setSettings({ ...settings, max_script_length_free: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border text-xs bg-zinc-900 border-zinc-800 text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1.5">
                    Max Script Length (Paid Plans)
                  </label>
                  <input
                    type="number"
                    value={settings.max_script_length_paid || '15000'}
                    onChange={(e) => setSettings({ ...settings, max_script_length_paid: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border text-xs bg-zinc-900 border-zinc-800 text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1.5">
                  Maintenance Mode
                </label>
                <select
                  value={settings.maintenance_mode || 'false'}
                  onChange={(e) => setSettings({ ...settings, maintenance_mode: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border text-xs bg-zinc-900 border-zinc-800 text-white"
                >
                  <option value="false">Disabled (Site Normal)</option>
                  <option value="true">Enabled (Maintenance Banner Active)</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={settingsSaving}
                className="px-6 py-2.5 rounded-xl text-xs font-bold bg-white text-black hover:bg-zinc-200 transition-all cursor-pointer disabled:opacity-50"
              >
                {settingsSaving ? 'Saving...' : 'Save Site Settings'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* TAB: PRICING PLANS & PACKAGES */}
      {activeTab === 'plans' && (
        <div className="space-y-6">
          {/* Top Header Card */}
          <div className="p-6 sm:p-7 rounded-3xl border bg-[#121215] border-zinc-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-mono text-purple-400 uppercase tracking-wider mb-1">
                <span>Platform Monetization</span>
                <span>/</span>
                <span className="text-zinc-300 font-bold">Dynamic Subscription Tiers</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Pricing Plans & Packages Manager
              </h3>
              <p className="text-xs text-zinc-400 mt-1 max-w-2xl">
                Configure plan prices, monthly character quotas, Pakistani Rupee conversion rates, marketing badges, and feature bullet lists. Changes update PostgreSQL and reflect immediately across the Pricing Page, User Dashboard, and JazzCash payment workflows.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={handleAddNewPlan}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                <span>+ Add Plan Tier</span>
              </button>
              <button
                type="button"
                onClick={handleResetPlansToDefaults}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                title="Restore default Free, Lite, Pro, and Studio configurations"
              >
                <span>↻ Reset Defaults</span>
              </button>
              <button
                type="button"
                onClick={() => handleSaveAllPlans()}
                disabled={plansSaving}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-white text-black hover:bg-zinc-200 transition-all flex items-center gap-1.5 shadow-lg shadow-white/5 cursor-pointer active:scale-95 disabled:opacity-50"
              >
                <span>{plansSaving ? 'Saving to Database...' : '💾 Save All Plans Changes'}</span>
              </button>
            </div>
          </div>

          {/* Feedback Message */}
          {plansFeedback && (
            <div className={`p-4 rounded-2xl text-xs font-semibold flex items-center justify-between gap-3 ${
              plansFeedback.type === 'success'
                ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                : 'bg-rose-500/10 text-rose-300 border border-rose-500/20'
            }`}>
              <span>{plansFeedback.text}</span>
              <button onClick={() => setPlansFeedback(null)} className="text-zinc-400 hover:text-white font-bold">✕</button>
            </div>
          )}

          {/* Plan Selector Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {plansList.map((p) => {
              const isSelected = (selectedPlanId || plansList[0]?.id) === p.id;
              return (
                <div
                  key={p.id}
                  onClick={() => setSelectedPlanId(p.id)}
                  className={`p-5 rounded-2xl border transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between ${
                    isSelected
                      ? 'bg-zinc-900/90 border-purple-500 ring-2 ring-purple-500/20 shadow-xl'
                      : 'bg-[#121215] border-zinc-800 hover:border-zinc-700 shadow-md'
                  }`}
                >
                  {p.badge && (
                    <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/30">
                      {p.badge}
                    </div>
                  )}

                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold font-mono text-zinc-500 uppercase">{p.id}</span>
                      {p.highlight && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                          ★ Featured
                        </span>
                      )}
                    </div>
                    <h4 className="text-base font-extrabold text-white truncate">{p.name}</h4>
                    <div className="mt-2 flex items-baseline gap-1">
                      <span className="text-2xl font-black text-white">
                        {p.priceMonthly === 0 ? 'FREE' : `$${Number(p.priceMonthly).toFixed(2)}`}
                      </span>
                      {p.priceMonthly > 0 && <span className="text-xs text-zinc-400">/mo</span>}
                    </div>
                    <div className="text-[11px] text-zinc-400 font-mono mt-0.5">
                      {p.pricePKR || `PKR ${p.priceMonthly * 280}`}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-zinc-800 flex items-center justify-between text-xs">
                    <span className="font-mono text-emerald-400 text-[11px] font-bold">
                      ⚡ {(p.creditCount || 0).toLocaleString()} chars
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      p.isEnabled !== false ? 'bg-emerald-500/10 text-emerald-400' : 'bg-zinc-800 text-zinc-500'
                    }`}>
                      {p.isEnabled !== false ? 'Active' : 'Hidden'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Detailed Plan Editor Form */}
          {(() => {
            const currentPlan = plansList.find(p => p.id === selectedPlanId) || plansList[0];
            if (!currentPlan) return null;

            return (
              <div className="p-6 sm:p-8 rounded-3xl border bg-[#121215] border-zinc-800 shadow-xl space-y-8">
                {/* Editor Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-zinc-800">
                  <div>
                    <div className="flex items-center gap-2 text-xs font-mono text-zinc-500 mb-1">
                      <span>Editing Package</span>
                      <span>•</span>
                      <span className="text-purple-400 font-bold">{currentPlan.id}</span>
                    </div>
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                      <span>{currentPlan.name}</span>
                      <span className="text-xs font-normal text-zinc-400 font-mono">({currentPlan.id})</span>
                    </h3>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleDeletePlan(currentPlan.id)}
                      className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-all cursor-pointer"
                    >
                      Delete This Tier
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSaveAllPlans()}
                      disabled={plansSaving}
                      className="px-4 py-2 rounded-xl text-xs font-bold bg-white text-black hover:bg-zinc-200 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                    >
                      {plansSaving ? 'Saving...' : 'Save Plan Changes'}
                    </button>
                  </div>
                </div>

                {/* Form Sections */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* SECTION 1: Identity & Presentation */}
                  <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 space-y-4">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-purple-400 font-mono">
                      1. Identification & Badges
                    </h4>

                    <div>
                      <label className="block text-xs font-bold text-zinc-300 mb-1">
                        Plan Key / Identifier <span className="text-zinc-500 text-[10px] font-normal">(Unique database key, e.g. Free, Lite, Pro, Studio, Enterprise)</span>
                      </label>
                      <input
                        type="text"
                        value={currentPlan.id || ''}
                        onChange={(e) => updatePlanField(currentPlan.id, 'id', e.target.value)}
                        className="w-full px-3.5 py-2 rounded-xl border text-xs bg-zinc-900 border-zinc-700 text-white font-mono focus:border-purple-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-zinc-300 mb-1">
                        Display Name <span className="text-zinc-500 text-[10px] font-normal">(User-facing title on pricing cards)</span>
                      </label>
                      <input
                        type="text"
                        value={currentPlan.name || ''}
                        onChange={(e) => updatePlanField(currentPlan.id, 'name', e.target.value)}
                        className="w-full px-3.5 py-2 rounded-xl border text-xs bg-zinc-900 border-zinc-700 text-white focus:border-purple-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-zinc-300 mb-1">
                        Marketing Badge / Ribbon <span className="text-zinc-500 text-[10px] font-normal">(e.g. Most Popular, Best Value, 20% OFF, or leave blank)</span>
                      </label>
                      <input
                        type="text"
                        value={currentPlan.badge || ''}
                        placeholder="Leave blank for no badge"
                        onChange={(e) => updatePlanField(currentPlan.id, 'badge', e.target.value)}
                        className="w-full px-3.5 py-2 rounded-xl border text-xs bg-zinc-900 border-zinc-700 text-white focus:border-purple-500 focus:outline-none"
                      />
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 pt-2">
                      <label className="flex items-center gap-2.5 text-xs text-zinc-200 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={currentPlan.highlight || false}
                          onChange={(e) => updatePlanField(currentPlan.id, 'highlight', e.target.checked)}
                          className="w-4 h-4 rounded bg-zinc-800 border-zinc-700 text-purple-600 focus:ring-0 cursor-pointer"
                        />
                        <span className="font-bold">Featured / Highlighted Card</span>
                      </label>

                      <label className="flex items-center gap-2.5 text-xs text-zinc-200 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={currentPlan.isEnabled !== false}
                          onChange={(e) => updatePlanField(currentPlan.id, 'isEnabled', e.target.checked)}
                          className="w-4 h-4 rounded bg-zinc-800 border-zinc-700 text-purple-600 focus:ring-0 cursor-pointer"
                        />
                        <span className="font-bold">Active / Visible to Users</span>
                      </label>
                    </div>
                  </div>

                  {/* SECTION 2: Pricing & Currency */}
                  <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 space-y-4">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400 font-mono">
                      2. Pricing & Currency Rates
                    </h4>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-zinc-300 mb-1">
                          Monthly USD ($)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={currentPlan.priceMonthly ?? 0}
                          onChange={(e) => updatePlanField(currentPlan.id, 'priceMonthly', parseFloat(e.target.value) || 0)}
                          className="w-full px-3.5 py-2 rounded-xl border text-xs bg-zinc-900 border-zinc-700 text-white font-mono focus:border-emerald-500 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-zinc-300 mb-1">
                          Annual USD ($ / mo)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={currentPlan.priceAnnual ?? 0}
                          onChange={(e) => updatePlanField(currentPlan.id, 'priceAnnual', parseFloat(e.target.value) || 0)}
                          className="w-full px-3.5 py-2 rounded-xl border text-xs bg-zinc-900 border-zinc-700 text-white font-mono focus:border-emerald-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-zinc-300 mb-1">
                        Pakistani Rupee Price (PKR) <span className="text-zinc-500 text-[10px] font-normal">(Used in JazzCash transfer prompts)</span>
                      </label>
                      <input
                        type="text"
                        value={currentPlan.pricePKR || ''}
                        onChange={(e) => updatePlanField(currentPlan.id, 'pricePKR', e.target.value)}
                        placeholder="e.g. PKR 2,800"
                        className="w-full px-3.5 py-2 rounded-xl border text-xs bg-zinc-900 border-zinc-700 text-white font-mono focus:border-emerald-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-zinc-300 mb-1">
                        Display Price Tag <span className="text-zinc-500 text-[10px] font-normal">(Header text, e.g. FREE, $10.00, $17.00)</span>
                      </label>
                      <input
                        type="text"
                        value={currentPlan.displayPrice || ''}
                        onChange={(e) => updatePlanField(currentPlan.id, 'displayPrice', e.target.value)}
                        className="w-full px-3.5 py-2 rounded-xl border text-xs bg-zinc-900 border-zinc-700 text-white font-mono focus:border-emerald-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* SECTION 3: Quotas & Character Limits */}
                  <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 space-y-4">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-pink-400 font-mono">
                      3. Balances & Synthesis Limits
                    </h4>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-zinc-300 mb-1">
                          Characters / Credits Allotment
                        </label>
                        <input
                          type="number"
                          value={currentPlan.creditCount ?? 2000}
                          onChange={(e) => updatePlanField(currentPlan.id, 'creditCount', parseInt(e.target.value, 10) || 0)}
                          className="w-full px-3.5 py-2 rounded-xl border text-xs bg-zinc-900 border-zinc-700 text-white font-mono focus:border-pink-500 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-zinc-300 mb-1">
                          Display Credits Text
                        </label>
                        <input
                          type="text"
                          value={currentPlan.credits || ''}
                          onChange={(e) => updatePlanField(currentPlan.id, 'credits', e.target.value)}
                          placeholder="e.g. 500,000 credits"
                          className="w-full px-3.5 py-2 rounded-xl border text-xs bg-zinc-900 border-zinc-700 text-white focus:border-pink-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-zinc-300 mb-1">
                          Max Chars / Gen
                        </label>
                        <input
                          type="number"
                          value={currentPlan.maxCharsPerGen ?? 5000}
                          onChange={(e) => updatePlanField(currentPlan.id, 'maxCharsPerGen', parseInt(e.target.value, 10) || 1000)}
                          className="w-full px-3 py-2 rounded-xl border text-xs bg-zinc-900 border-zinc-700 text-white font-mono"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-zinc-300 mb-1">
                          Voice Clones
                        </label>
                        <input
                          type="number"
                          value={currentPlan.customVoicesCount ?? 0}
                          onChange={(e) => updatePlanField(currentPlan.id, 'customVoicesCount', parseInt(e.target.value, 10) || 0)}
                          className="w-full px-3 py-2 rounded-xl border text-xs bg-zinc-900 border-zinc-700 text-white font-mono"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-zinc-300 mb-1">
                          Queued Tasks
                        </label>
                        <input
                          type="number"
                          value={currentPlan.maxQueuedTasks ?? 1}
                          onChange={(e) => updatePlanField(currentPlan.id, 'maxQueuedTasks', parseInt(e.target.value, 10) || 1)}
                          className="w-full px-3 py-2 rounded-xl border text-xs bg-zinc-900 border-zinc-700 text-white font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  {/* SECTION 4: Copy & Call To Action */}
                  <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 space-y-4">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-400 font-mono">
                      4. Description & Call to Action
                    </h4>

                    <div>
                      <label className="block text-xs font-bold text-zinc-300 mb-1">
                        Plan Summary Description
                      </label>
                      <textarea
                        rows="2"
                        value={currentPlan.desc || ''}
                        onChange={(e) => updatePlanField(currentPlan.id, 'desc', e.target.value)}
                        className="w-full px-3.5 py-2 rounded-xl border text-xs bg-zinc-900 border-zinc-700 text-white focus:border-cyan-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-zinc-300 mb-1">
                        Call-to-Action (CTA) Button Text
                      </label>
                      <input
                        type="text"
                        value={currentPlan.buttonText || ''}
                        onChange={(e) => updatePlanField(currentPlan.id, 'buttonText', e.target.value)}
                        placeholder="e.g. Subscribe to Lite, Upgrade to Pro"
                        className="w-full px-3.5 py-2 rounded-xl border text-xs bg-zinc-900 border-zinc-700 text-white focus:border-cyan-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* SECTION 5: Feature Checklist (Bullet Points) */}
                <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 font-mono">
                        5. Feature Checklist & Bullet Points
                      </h4>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        These bullet points are rendered on the pricing page card for this plan.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => addPlanFeature(currentPlan.id)}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                    >
                      <span>+ Add Feature Bullet</span>
                    </button>
                  </div>

                  <div className="space-y-2.5 pt-2">
                    {(currentPlan.features || []).map((feat, fIdx) => (
                      <div key={fIdx} className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-zinc-800 text-zinc-400 text-[11px] font-mono flex items-center justify-center shrink-0">
                          {fIdx + 1}
                        </span>
                        <input
                          type="text"
                          value={feat}
                          onChange={(e) => updatePlanFeature(currentPlan.id, fIdx, e.target.value)}
                          className="flex-1 px-3.5 py-2 rounded-xl border text-xs bg-zinc-900 border-zinc-800 text-white focus:border-amber-500 focus:outline-none"
                          placeholder="Feature description bullet point..."
                        />
                        <button
                          type="button"
                          onClick={() => removePlanFeature(currentPlan.id, fIdx)}
                          className="w-8 h-8 rounded-xl bg-zinc-800/80 hover:bg-rose-500/20 text-zinc-400 hover:text-rose-400 flex items-center justify-center shrink-0 transition-all cursor-pointer"
                          title="Remove this feature bullet"
                        >
                          ✕
                        </button>
                      </div>
                    ))}

                    {(currentPlan.features || []).length === 0 && (
                      <div className="p-4 rounded-xl border border-dashed border-zinc-800 text-center text-xs text-zinc-500">
                        No feature bullets defined yet. Click "+ Add Feature Bullet" to add one.
                      </div>
                    )}
                  </div>
                </div>

                {/* Bottom Global Action Banner */}
                <div className="pt-4 border-t border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="text-xs text-zinc-400">
                    Editing <span className="text-white font-bold">{currentPlan.name}</span>. Remember to save all changes to commit them to the live PostgreSQL database.
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => handleSaveAllPlans()}
                      disabled={plansSaving}
                      className="px-6 py-2.5 rounded-xl text-xs font-bold bg-white text-black hover:bg-zinc-200 transition-all cursor-pointer shadow-lg active:scale-95 disabled:opacity-50"
                    >
                      {plansSaving ? 'Saving All Plans...' : '💾 Save All Plans Configuration'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* TAB 5: SUPERADMIN SECURITY CREDENTIALS */}
      {activeTab === 'security' && (
        <div className="max-w-3xl space-y-6">
          <div className="p-6 sm:p-8 rounded-3xl border bg-[#121215] border-zinc-800 shadow-xl">
            <h3 className="text-base font-bold text-white mb-1">Superadmin Security Configuration</h3>
            <p className="text-xs text-zinc-400 mb-6">Environment-based master administrative access</p>

            <div className="space-y-4 text-xs font-mono">
              <div className="p-4 rounded-2xl border bg-zinc-900/80 border-zinc-800">
                <span className="text-[11px] text-zinc-400 uppercase tracking-wider block font-sans font-bold mb-1">
                  Configured Superadmin Email
                </span>
                <span className="text-white text-sm font-bold">admin@voiceclonestudio.com</span>
              </div>

              <div className="p-4 rounded-2xl border bg-zinc-900/80 border-zinc-800">
                <span className="text-[11px] text-zinc-400 uppercase tracking-wider block font-sans font-bold mb-1">
                  Active Role Privileges
                </span>
                <span className="text-emerald-400 text-sm font-bold">superadmin (Master Level)</span>
              </div>

              <div className="p-4 rounded-2xl border bg-zinc-900/80 border-zinc-800">
                <span className="text-[11px] text-zinc-400 uppercase tracking-wider block font-sans font-bold mb-1">
                  Security Protocol & Rotation Guide
                </span>
                <p className="text-zinc-300 font-sans text-xs leading-relaxed mt-1">
                  Superadmin credentials are seeded from your backend <code className="bg-zinc-800 px-1.5 py-0.5 rounded text-white">.env</code> file (<code className="text-zinc-200">SUPERADMIN_EMAIL</code> and <code className="text-zinc-200">SUPERADMIN_PASSWORD</code>). To rotate the password, update the value in <code className="bg-zinc-800 px-1.5 py-0.5 rounded text-white">.env</code> (or Railway Service Variables in production) and restart the server.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB: JAZZCASH MANUAL PAYMENTS */}
      {activeTab === 'payments' && (
        <div className="space-y-6">
          {/* Header & Feedback */}
          {actionFeedback && (
            <div className={`p-4 rounded-2xl text-xs font-semibold flex items-center justify-between gap-3 ${
              actionFeedback.type === 'success'
                ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                : 'bg-rose-500/10 text-rose-300 border border-rose-500/20'
            }`}>
              <span>{actionFeedback.text}</span>
              <button onClick={() => setActionFeedback(null)} className="text-zinc-400 hover:text-white font-bold">✕</button>
            </div>
          )}

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl border bg-[#121215] border-zinc-800">
              <span className="text-[11px] uppercase font-bold text-zinc-400">JazzCash Account</span>
              <p className="text-sm font-bold text-white mt-1">03037108440</p>
              <span className="text-[10px] text-zinc-500">Title: AROSA</span>
            </div>
            <div className="p-5 rounded-2xl border bg-[#121215] border-zinc-800">
              <span className="text-[11px] uppercase font-bold text-zinc-400">Pending Review</span>
              <p className="text-2xl font-mono font-bold text-amber-400 mt-1">{pendingPaymentsCount}</p>
              <span className="text-[10px] text-zinc-500">Awaiting Admin Verification</span>
            </div>
            <div className="p-5 rounded-2xl border bg-[#121215] border-zinc-800">
              <span className="text-[11px] uppercase font-bold text-zinc-400">Total Submissions</span>
              <p className="text-2xl font-mono font-bold text-white mt-1">{payments.length}</p>
              <span className="text-[10px] text-zinc-500">All Time</span>
            </div>
            <div className="p-5 rounded-2xl border bg-[#121215] border-zinc-800">
              <span className="text-[11px] uppercase font-bold text-zinc-400">Approved Payments</span>
              <p className="text-2xl font-mono font-bold text-emerald-400 mt-1">
                {payments.filter(p => p.status === 'approved').length}
              </p>
              <span className="text-[10px] text-zinc-500">Upgraded Users</span>
            </div>
          </div>

          {/* Table Container */}
          <div className="rounded-3xl border bg-[#121215] border-zinc-800 shadow-xl overflow-hidden">
            {/* Filter controls */}
            <div className="p-5 border-b border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <img src="/jazzcash.webp" alt="JazzCash" className="w-6 h-6 object-contain rounded" />
                <h3 className="text-sm font-bold text-white">Manual Payment Approval Queue</h3>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {[
                  { id: 'all', label: 'All Submissions' },
                  { id: 'pending', label: 'Pending Only' },
                  { id: 'approved', label: 'Approved' },
                  { id: 'rejected', label: 'Rejected' }
                ].map(f => (
                  <button
                    key={f.id}
                    onClick={() => setPaymentStatusFilter(f.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      paymentStatusFilter === f.id
                        ? 'bg-white text-black'
                        : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
                <button
                  onClick={fetchPayments}
                  disabled={paymentsLoading}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 transition-all cursor-pointer"
                >
                  ↻ Refresh
                </button>
              </div>
            </div>

            {/* Table */}
            {paymentsLoading ? (
              <div className="text-center py-12 text-xs text-zinc-500">
                Loading payment records from PostgreSQL...
              </div>
            ) : payments.length === 0 ? (
              <div className="text-center py-16 text-zinc-500 text-xs">
                No payment requests match the selected filter ({paymentStatusFilter}).
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-zinc-800 text-zinc-400 bg-zinc-950/40 font-semibold">
                      <th className="py-3.5 px-5">User</th>
                      <th className="py-3.5 px-4">Plan & Credits</th>
                      <th className="py-3.5 px-4">Transaction ID (TID)</th>
                      <th className="py-3.5 px-4">Sender Phone</th>
                      <th className="py-3.5 px-4">Receipt Screenshot</th>
                      <th className="py-3.5 px-4">Submitted At</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-5 text-right">Approval Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60 font-mono">
                    {payments.map((p) => {
                      const isProcessing = actionProcessingId === p.id;
                      const screenshotUrl = p.screenshotUrl
                        ? (p.screenshotUrl.startsWith('http') ? p.screenshotUrl : `${API_BASE}${p.screenshotUrl}`)
                        : null;

                      return (
                        <tr key={p.id} className="hover:bg-zinc-900/30 transition-colors">
                          <td className="py-4 px-5 font-sans">
                            <span className="font-bold text-white block text-xs">{p.user?.name || 'User'}</span>
                            <span className="text-[11px] text-zinc-400 font-mono block">{p.user?.email}</span>
                            <span className="text-[10px] text-zinc-500 block">Current: {p.user?.plan || 'Free'} ({p.user?.credits?.toLocaleString() || 0} creds)</span>
                          </td>

                          <td className="py-4 px-4 font-sans">
                            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-zinc-800 text-white block w-fit mb-1">
                              {p.planType} Plan
                            </span>
                            <span className="text-[10px] text-emerald-400 font-mono">
                              +{p.planType === 'Lite' ? '500,000' : p.planType === 'Pro' ? '1,000,000' : '3,000,000'} chars
                            </span>
                          </td>

                          <td className="py-4 px-4">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-white tracking-wider select-all">{p.transactionId}</span>
                              <button
                                onClick={() => navigator.clipboard.writeText(p.transactionId)}
                                title="Copy TID"
                                className="text-zinc-500 hover:text-white text-xs cursor-pointer"
                              >
                                📋
                              </button>
                            </div>
                            <span className="text-[10px] text-zinc-500 font-sans block">{p.amount || 'PKR Standard'}</span>
                          </td>

                          <td className="py-4 px-4 text-zinc-300">
                            {p.senderNumber || <span className="text-zinc-600 font-sans text-[11px]">Not Provided</span>}
                          </td>

                          <td className="py-4 px-4 font-sans">
                            {screenshotUrl ? (
                              <button
                                type="button"
                                onClick={() => setPreviewScreenshotUrl(screenshotUrl)}
                                className="group relative inline-block rounded-lg overflow-hidden border border-zinc-700 hover:border-zinc-500 transition-all cursor-pointer"
                              >
                                <img
                                  src={screenshotUrl}
                                  alt="Screenshot Preview"
                                  className="w-14 h-10 object-cover bg-black"
                                  onError={(e) => {
                                    e.target.style.display = 'none';
                                  }}
                                />
                                <span className="absolute inset-0 bg-black/60 flex items-center justify-center text-[10px] text-white opacity-0 group-hover:opacity-100 transition-opacity font-bold">
                                  🔍 Zoom
                                </span>
                              </button>
                            ) : (
                              <span className="text-zinc-600 text-[11px]">No Screenshot</span>
                            )}
                          </td>

                          <td className="py-4 px-4 text-zinc-400 text-[11px] font-sans">
                            {new Date(p.createdAt).toLocaleDateString()}
                            <span className="text-[10px] text-zinc-500 block font-mono">
                              {new Date(p.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </td>

                          <td className="py-4 px-4 font-sans">
                            {p.status === 'approved' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                ✓ Approved
                              </span>
                            )}
                            {p.status === 'pending' && (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/20 animate-pulse">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                                Pending Review
                              </span>
                            )}
                            {p.status === 'rejected' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                                ✕ Rejected
                              </span>
                            )}
                            {p.adminNotes && (
                              <span className="text-[10px] text-zinc-400 block mt-1 max-w-[160px] truncate" title={p.adminNotes}>
                                Note: {p.adminNotes}
                              </span>
                            )}
                          </td>

                          <td className="py-4 px-5 text-right font-sans">
                            {p.status === 'pending' ? (
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  type="button"
                                  disabled={isProcessing}
                                  onClick={() => handleApprovePayment(p.id)}
                                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-black shadow-md transition-all cursor-pointer disabled:opacity-50 active:scale-95"
                                >
                                  {isProcessing ? 'Saving...' : '✓ Approve'}
                                </button>
                                <button
                                  type="button"
                                  disabled={isProcessing}
                                  onClick={() => handleRejectPayment(p.id)}
                                  className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-zinc-900 hover:bg-rose-950 text-rose-300 border border-zinc-800 hover:border-rose-800 transition-all cursor-pointer disabled:opacity-50"
                                >
                                  Reject
                                </button>
                              </div>
                            ) : p.status === 'approved' ? (
                              <span className="text-[11px] font-bold text-emerald-400">
                                Completed
                              </span>
                            ) : (
                              <button
                                type="button"
                                disabled={isProcessing}
                                onClick={() => handleApprovePayment(p.id)}
                                className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 cursor-pointer"
                              >
                                Re-approve
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
        </main>
      </div>

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="w-full max-w-md rounded-3xl border p-6 sm:p-8 bg-[#121215] border-zinc-800 text-zinc-100 shadow-2xl relative">
            <h3 className="text-lg font-bold text-white mb-1">Edit User Profile & Access</h3>
            <p className="text-xs text-zinc-400 font-mono mb-4">{editingUser.email}</p>

            <form onSubmit={handleSaveUser} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">Plan Subscription</label>
                <select
                  value={editPlan}
                  onChange={(e) => setEditPlan(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border text-xs bg-zinc-900 border-zinc-700 text-white"
                >
                  <option value="Free">Free Plan</option>
                  <option value="Lite">Lite Plan</option>
                  <option value="Pro">Pro Plan</option>
                  <option value="Studio">Studio Plan</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">Credits Allocation</label>
                <input
                  type="number"
                  value={editCredits}
                  onChange={(e) => setEditCredits(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border text-xs bg-zinc-900 border-zinc-700 text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">Account Role</label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border text-xs bg-zinc-900 border-zinc-700 text-white"
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                  <option value="superadmin">Superadmin</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">Account Status</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border text-xs bg-zinc-900 border-zinc-700 text-white"
                >
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSaving}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-white text-black hover:bg-zinc-200 cursor-pointer disabled:opacity-50"
                >
                  {editSaving ? 'Saving...' : 'Apply Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Screenshot Zoom Modal */}
      {previewScreenshotUrl && (
        <div
          className="fixed inset-0 z-[140] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fadeIn"
          onClick={() => setPreviewScreenshotUrl(null)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] bg-[#121215] border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <img src="/jazzcash.webp" alt="JazzCash" className="w-5 h-5 object-contain rounded" />
                <span className="text-xs font-bold text-white">Payment Receipt Proof (Original Upload)</span>
              </div>
              <button
                type="button"
                onClick={() => setPreviewScreenshotUrl(null)}
                className="text-zinc-400 hover:text-white text-xs font-bold px-2 py-1 rounded-lg bg-zinc-900 border border-zinc-800 cursor-pointer"
              >
                ✕ Close
              </button>
            </div>
            <div className="p-4 flex items-center justify-center overflow-auto max-h-[78vh] bg-black/60">
              <img
                src={previewScreenshotUrl}
                alt="Payment Receipt Large"
                className="max-w-full max-h-[72vh] rounded-xl object-contain shadow-2xl border border-zinc-800/80"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
