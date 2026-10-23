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
    id: 'Basic',
    name: 'Basic',
    priceMonthly: 900,
    priceAnnual: 720,
    pricePKR: 'PKR 900',
    displayPrice: 'PKR 900',
    credits: '100,000 credits',
    creditCount: 100000,
    badge: '',
    desc: 'Perfect for beginners and individual creators seeking reliable voice synthesis at an entry budget.',
    features: [
      'Community support 24/7',
      'MP3 download format',
      'Standard audio quality',
      'Basic voice selection',
      'Max 5,000 characters per conversion'
    ],
    buttonText: 'Subscribe to Basic',
    highlight: false,
    maxCharsPerGen: 5000,
    customVoicesCount: 1,
    maxQueuedTasks: 1,
    isEnabled: true
  },
  {
    id: 'Silver',
    name: 'Silver',
    priceMonthly: 1600,
    priceAnnual: 1280,
    pricePKR: 'PKR 1,600',
    displayPrice: 'PKR 1,600',
    credits: '250,000 credits',
    creditCount: 250000,
    badge: '',
    desc: 'Great for active creators seeking dependable voice cloning and extended generation limits.',
    features: [
      'Community support 24/7',
      'MP3 download format',
      'Standard audio quality',
      'Basic voice selection',
      'Max 5,000 characters per conversion'
    ],
    buttonText: 'Subscribe to Silver',
    highlight: false,
    maxCharsPerGen: 5000,
    customVoicesCount: 3,
    maxQueuedTasks: 2,
    isEnabled: true
  },
  {
    id: 'Lite',
    name: 'Lite',
    priceMonthly: 2800,
    priceAnnual: 2240,
    pricePKR: 'PKR 2,800',
    displayPrice: 'PKR 2,800',
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
    priceMonthly: 4750,
    priceAnnual: 3800,
    pricePKR: 'PKR 4,750',
    displayPrice: 'PKR 4,750',
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
    priceMonthly: 6700,
    priceAnnual: 5360,
    pricePKR: 'PKR 6,700',
    displayPrice: 'PKR 6,700',
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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
  const [editExpiry, setEditExpiry] = useState('');
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
      priceMonthly: 9800,
      priceAnnual: 7800,
      pricePKR: 'PKR 9,800',
      displayPrice: 'PKR 9,800',
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
    const exp = u.creditsExpiresAt || u.subscriptionEndDate;
    if (exp) {
      try {
        setEditExpiry(new Date(exp).toISOString().split('T')[0]);
      } catch (e) {
        setEditExpiry('');
      }
    } else {
      setEditExpiry('');
    }
  };

  // Save Edited User
  const handleSaveUser = async (e) => {
    e.preventDefault();
    if (!editingUser) return;
    setEditSaving(true);

    try {
      const payload = {
        plan: editPlan,
        credits: parseInt(editCredits, 10),
        role: editRole,
        status: editStatus,
        creditsExpiresAt: editPlan === 'Free' ? null : (editExpiry ? new Date(editExpiry).toISOString() : undefined),
        subscriptionEndDate: editPlan === 'Free' ? null : (editExpiry ? new Date(editExpiry).toISOString() : undefined)
      };

      const res = await axios.put(`${API_BASE}/api/admin/users/${editingUser.id}`, payload);

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
      <div className="w-full max-w-4xl mx-auto px-4 py-20 text-center text-zinc-900">
        <div className="p-8 rounded-3xl border bg-white border-zinc-200 shadow-xl">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center mx-auto mb-4">
            <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-zinc-900 mb-2">Administrative Privileges Required</h2>
          <p className="text-xs text-zinc-600 mb-6 max-w-md mx-auto">
            You are signed in as <span className="font-mono text-zinc-900 font-semibold">{user?.email}</span> (role: {user?.role || 'user'}). Only accounts with Admin or Superadmin role can access this console.
          </p>
          <button
            onClick={() => onNavigate('dashboard')}
            className="px-5 py-2.5 rounded-xl text-xs font-bold bg-zinc-900 hover:bg-zinc-800 text-white shadow-sm transition-all cursor-pointer"
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
      label: 'Overview',
      desc: 'Platform metrics, remaining credits & system health',
      icon: (
        <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
      )
    },
    {
      id: 'generations',
      label: 'Audio Library',
      desc: 'Platform synthesized voice records & audio project logs',
      badge: `${generations.length}`,
      icon: (
        <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
        </svg>
      )
    },
    {
      id: 'payments',
      label: 'Plan & Billing',
      desc: 'Verify manual JazzCash receipts, approve plans & credit balances',
      badge: pendingPaymentsCount > 0 ? `${pendingPaymentsCount} Pending` : `${payments.length}`,
      isAlert: pendingPaymentsCount > 0,
      icon: (
        <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
      )
    },
    {
      id: 'users',
      label: 'Users',
      desc: 'Direct database account controls, credit overrides & roles',
      badge: `${users.length}`,
      icon: (
        <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      )
    },
    {
      id: 'plans',
      label: 'Pricing Plans',
      desc: 'Edit pricing tiers, quotas, PKR rates, badges & feature lists',
      badge: `${plansList.length} Tiers`,
      icon: (
        <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
        </svg>
      )
    },
    {
      id: 'settings',
      label: 'Settings',
      desc: 'Platform-wide defaults, free tier limits & engine options',
      icon: (
        <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        </svg>
      )
    },
    {
      id: 'security',
      label: 'Security',
      desc: 'Superadmin credentials, environment secrets (.env) and tokens',
      icon: (
        <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      )
    }
  ];

  // Default mock templates from Image 1 if platform generations are empty
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
    <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-5 sm:py-8 animate-fadeIn text-zinc-900">
      <div className="bg-white rounded-3xl border border-zinc-200/90 shadow-sm overflow-hidden flex flex-col md:flex-row min-h-[820px]">
        {/* ===== MOBILE HEADER BAR (Visible only on mobile to hide/expand admin menu) ===== */}
        <div className="md:hidden flex items-center justify-between px-4 py-3.5 border-b border-zinc-200/80 bg-white sticky top-0 z-20">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
              <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                <rect x="2" y="9" width="2.5" height="6" rx="1.25" />
                <rect x="6.5" y="5" width="2.5" height="14" rx="1.25" />
                <rect x="11" y="2" width="2.5" height="20" rx="1.25" />
                <rect x="15.5" y="6" width="2.5" height="12" rx="1.25" />
                <rect x="20" y="10" width="2.5" height="4" rx="1.25" />
              </svg>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="font-extrabold text-sm tracking-tight text-zinc-900">VoiceWeave</span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-violet-100 text-violet-700">Admin</span>
            </div>
            <span className="text-zinc-300">/</span>
            <div className="flex items-center gap-1.5 truncate text-xs font-bold text-violet-700 bg-violet-50 px-2.5 py-1 rounded-lg border border-violet-100/90">
              <span>{adminNavTabs.find((t) => t.id === activeTab)?.label || 'Overview'}</span>
              {pendingPaymentsCount > 0 && activeTab !== 'payments' && (
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" title={`${pendingPaymentsCount} pending payment(s)`} />
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 active:scale-95 ${
              mobileMenuOpen
                ? 'bg-violet-600 text-white shadow-xs'
                : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-800 border border-zinc-200'
            }`}
            aria-label={mobileMenuOpen ? 'Hide Menu' : 'Expand Menu'}
          >
            <span>{mobileMenuOpen ? 'Hide' : 'Menu'}</span>
            {mobileMenuOpen ? (
              <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>

        {/* ===== ASIDE BAR (SIDEBAR Matching Image 1) ===== */}
        <aside
          className={`${
            mobileMenuOpen ? 'flex' : 'hidden'
          } md:flex flex-col w-full md:w-64 border-b md:border-b-0 md:border-r border-zinc-200/80 p-5 sm:p-6 justify-between shrink-0 bg-white transition-all`}
        >
          <div>
            {/* Logo (Desktop only, mobile has it in header) */}
            <div className="hidden md:flex items-center gap-2 mb-6">
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
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-violet-100 text-violet-700">Admin</span>
              </div>
            </div>

            {/* Account Profile Card */}
            <div className="flex items-center gap-3 px-3 py-3 mb-6 bg-zinc-50 md:bg-transparent rounded-2xl md:rounded-none border border-zinc-200/60 md:border-0">
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-violet-600 to-indigo-600 text-white font-bold text-sm flex items-center justify-center shrink-0 shadow-xs uppercase">
                {user?.name ? user.name[0] : 'A'}
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-zinc-900 truncate leading-tight">
                  {user?.name || 'Alex Johnson'}
                </h3>
                <p className="text-xs text-zinc-400 font-medium">Administrator</p>
              </div>
            </div>

            {/* Vertical Navigation Items */}
            <nav className="space-y-1">
              {adminNavTabs.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      isActive
                        ? 'bg-violet-100/70 text-violet-800 font-bold'
                        : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100/80'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={isActive ? 'text-violet-700' : 'text-zinc-400'}>
                        {tab.icon}
                      </span>
                      <span>{tab.label}</span>
                    </div>
                    {tab.badge && (
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
                          tab.isAlert
                            ? 'bg-amber-400 text-black font-extrabold animate-pulse'
                            : isActive
                            ? 'bg-white text-zinc-900 shadow-2xs'
                            : 'bg-zinc-100 text-zinc-700 border border-zinc-200'
                        }`}
                      >
                        {tab.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Bottom Quick Links */}
          <div className="pt-6 border-t border-zinc-100 space-y-2 mt-4 md:mt-0">
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onNavigate('dashboard');
              }}
              className="w-full py-2 px-3 rounded-xl text-xs font-bold bg-white hover:bg-zinc-50 text-zinc-800 border border-zinc-200/90 shadow-2xs transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>← User View</span>
            </button>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onNavigate('studio');
              }}
              className="w-full py-2 px-3 rounded-xl text-xs font-bold bg-zinc-900 text-white hover:bg-zinc-800 transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer"
            >
              <span>🎙️ Studio DAW</span>
            </button>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              className="md:hidden w-full py-2 px-3 rounded-xl text-xs font-semibold text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100 transition-all flex items-center justify-center gap-1.5 cursor-pointer mt-1"
            >
              <span>✕ Close Menu</span>
            </button>
          </div>
        </aside>

        {/* ===== MAIN CONTENT AREA (Matching Image 1) ===== */}
        <main className="flex-1 p-6 sm:p-8 space-y-7 bg-slate-50/40 overflow-x-hidden min-w-0">
          {/* Main Dashboard Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h1 className="text-2xl font-extrabold text-zinc-900 tracking-tight">
              {activeTab === 'overview' ? 'Dashboard' : adminNavTabs.find(t => t.id === activeTab)?.label}
            </h1>
            <div className="flex items-center gap-2">
              <button
                onClick={fetchAdminOverview}
                disabled={loading}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-white hover:bg-zinc-50 text-zinc-700 border border-zinc-200 shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                <span>↻ Refresh Platform</span>
              </button>
            </div>
          </div>

          {/* TAB 1: OVERVIEW (Matching Image 1 Pixel-for-Pixel) */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Welcome Banner Card */}
              <div className="p-6 rounded-2xl bg-[#f0f4ff] border border-indigo-100/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs">
                <div>
                  <h2 className="text-lg font-bold text-zinc-900">
                    Welcome back, {user?.name?.split(' ')[0] || 'Alex'}! Let's create amazing voiceovers today.
                  </h2>
                  <p className="text-xs text-zinc-500 mt-1 font-normal">
                    Start a new project or manage your library.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {pendingPaymentsCount > 0 && (
                    <button
                      onClick={() => setActiveTab('payments')}
                      className="px-4 py-2.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-md shadow-amber-500/20 shrink-0 cursor-pointer transition-all"
                    >
                      Verify {pendingPaymentsCount} Payments
                    </button>
                  )}
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
              </div>

              {/* 4 Metric Cards in a Row (Matching Image 1) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
                {/* Card 1: Credits Remaining */}
                {(() => {
                  const currentPlan = user?.plan || 'Pro';
                  const lower = currentPlan.toLowerCase();
                  const planTotal = lower.includes('studio')
                    ? 3000000
                    : lower.includes('pro')
                    ? 1000000
                    : lower.includes('lite')
                    ? 500000
                    : lower.includes('silver')
                    ? 250000
                    : lower.includes('basic')
                    ? 100000
                    : 2000;

                  const currentCredits = typeof user?.credits === 'number' ? user.credits : 1000000;
                  const maxCredits = Math.max(planTotal, currentCredits);
                  const remainingPct = maxCredits > 0
                    ? Math.min(100, Math.max(0, Math.round((currentCredits / maxCredits) * 100)))
                    : 0;
                  const usedPct = Math.max(0, 100 - remainingPct);

                  return (
                    <div className="p-5 rounded-2xl border bg-white border-zinc-200/90 shadow-2xs flex flex-col justify-between">
                      <div className="text-xs font-semibold text-zinc-600 mb-1">
                        Credits Remaining
                      </div>

                      <div className="flex items-center justify-between gap-3 my-1">
                        <div>
                          <div className="text-xl sm:text-2xl font-bold text-zinc-900 tracking-tight">
                            {currentCredits.toLocaleString()}
                            <span className="text-zinc-400 font-normal text-sm">
                              {' '}/ {maxCredits.toLocaleString()}
                            </span>
                          </div>
                          <p className="text-[11px] text-zinc-500 font-medium mt-1">
                            <span className="font-bold text-zinc-700">{usedPct}%</span> Used
                          </p>
                          <p className="text-[10px] text-zinc-400">admin quota: Unlimited</p>
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
                              strokeDasharray={`${remainingPct}, 100`}
                              strokeLinecap="round"
                              strokeWidth="3.5"
                              stroke="currentColor"
                              fill="none"
                              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                            />
                          </svg>
                          <span className="absolute text-[11px] font-bold font-mono text-zinc-900">
                            {remainingPct}%
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Card 2: Total Characters Voiced */}
                {(() => {
                  const totalChars = overview?.stats?.totalCharsSynthesized || 0;
                  const formatChars = (num) => {
                    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
                    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
                    return num.toLocaleString();
                  };

                  return (
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
                          {formatChars(totalChars)}
                        </div>
                        <p className="text-[11px] text-emerald-600 font-semibold mt-1">
                          Platform synthesis total
                        </p>
                      </div>
                    </div>
                  );
                })()}

                {/* Card 3: Voice Clones Created */}
                {(() => {
                  const voiceCount = overview?.stats?.totalVoices || 4;
                  return (
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
                          {voiceCount} Active Clones
                        </div>
                        <p className="text-[11px] text-zinc-500 mt-1">
                          Neural voice registry
                        </p>
                      </div>
                    </div>
                  );
                })()}

                {/* Card 4: Audio Files Saved */}
                {(() => {
                  const count = overview?.stats?.audioFilesCount ?? generations.length;
                  const storageMb = overview?.stats?.audioStorageMb || '0';
                  return (
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
                          {count} Files
                        </div>
                        <p className="text-[11px] text-zinc-500 mt-1">
                          {storageMb} MB server storage
                        </p>
                      </div>
                    </div>
                  );
                })()}
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
                              speaker: gen.referenceVoice ? gen.referenceVoice.replace(/\.wav$/i, '').split('(')[0].trim() : 'Sarah',
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
                                  onClick={() => {
                                    if (item.id && !item.id.startsWith('mock-')) {
                                      handleDeleteGeneration(item.id);
                                    } else {
                                      alert('Template sample row');
                                    }
                                  }}
                                  className="text-zinc-500 hover:text-rose-600 cursor-pointer"
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

                  {/* Table Footer with Pagination Matching Image 1 */}
                  <div className="p-3.5 bg-zinc-50/50 border-t border-zinc-100 flex items-center justify-between text-xs text-zinc-500">
                    <span>1-4 of 128 items</span>
                    <div className="flex items-center gap-2">
                      <button className="px-2.5 py-1 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-100 text-zinc-600 disabled:opacity-40 cursor-pointer">
                        &lt; Previous
                      </button>
                      <button className="px-2.5 py-1 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-100 text-zinc-800 font-semibold cursor-pointer">
                        Next &gt;
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Server Storage & Health Diagnostics Card */}
              <div className="p-6 rounded-2xl border bg-white border-zinc-200/90 shadow-2xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-bold text-zinc-900">Server Storage & Maintenance</h3>
                    <p className="text-xs text-zinc-500 mt-0.5">Purge older audio cached on Railway disk to maintain storage capacity</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      PostgreSQL Connected
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                      120 Voices Ready
                    </span>
                  </div>
                </div>

                {cleanupMessage && (
                  <div className={`p-3 rounded-xl text-xs font-semibold ${
                    cleanupMessage.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                  }`}>
                    {cleanupMessage.text}
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-zinc-100">
                  <span className="text-xs text-zinc-600 font-medium">Delete audio older than:</span>
                  <select
                    value={cleanupHours}
                    onChange={(e) => setCleanupHours(e.target.value)}
                    className="px-3 py-1.5 rounded-xl text-xs bg-white border border-zinc-300 text-zinc-900 focus:outline-none focus:border-zinc-900"
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
                    className="px-4 py-1.5 rounded-xl text-xs font-bold bg-zinc-900 hover:bg-zinc-800 text-white shadow-xs cursor-pointer disabled:opacity-50 transition-all active:scale-95"
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
                    className="px-4 py-1.5 rounded-xl text-xs font-bold bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 cursor-pointer disabled:opacity-50 transition-all active:scale-95"
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
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-2xl border bg-white border-zinc-200 shadow-sm">
            <div className="w-full md:w-72">
              <input
                type="text"
                placeholder="Search by name or email..."
                value={userSearch}
                onChange={(e) => {
                  setUserSearch(e.target.value);
                  setTimeout(fetchUsers, 200);
                }}
                className="w-full px-3.5 py-2 rounded-xl border text-xs bg-white border-zinc-300 text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs">
              <div>
                <label className="text-[11px] text-zinc-500 mr-2 font-medium">Plan:</label>
                <select
                  value={userPlanFilter}
                  onChange={(e) => {
                    setUserPlanFilter(e.target.value);
                    setTimeout(fetchUsers, 100);
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-white border border-zinc-300 text-zinc-800 focus:outline-none focus:border-zinc-900"
                >
                  <option value="all">All Plans</option>
                  <option value="Free">Free</option>
                  <option value="Basic">Basic</option>
                  <option value="Silver">Silver</option>
                  <option value="Lite">Lite</option>
                  <option value="Pro">Pro</option>
                  <option value="Studio">Studio</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] text-zinc-500 mr-2 font-medium">Role:</label>
                <select
                  value={userRoleFilter}
                  onChange={(e) => {
                    setUserRoleFilter(e.target.value);
                    setTimeout(fetchUsers, 100);
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-white border border-zinc-300 text-zinc-800 focus:outline-none focus:border-zinc-900"
                >
                  <option value="all">All Roles</option>
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                  <option value="superadmin">Superadmin</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] text-zinc-500 mr-2 font-medium">Status:</label>
                <select
                  value={userStatusFilter}
                  onChange={(e) => {
                    setUserStatusFilter(e.target.value);
                    setTimeout(fetchUsers, 100);
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-white border border-zinc-300 text-zinc-800 focus:outline-none focus:border-zinc-900"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>
            </div>
          </div>

          {/* Users Table */}
          <div className="rounded-3xl border bg-white border-zinc-200 overflow-x-auto shadow-sm">
            <table className="w-full text-left text-xs text-zinc-800">
              <thead className="border-b border-zinc-200 bg-zinc-50 text-[11px] uppercase tracking-wider text-zinc-500 font-semibold">
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
              <tbody className="divide-y divide-zinc-200 font-mono">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-zinc-50/80 transition-colors">
                    <td className="px-5 py-4">
                      <div className="font-sans font-bold text-zinc-900">{u.name}</div>
                      <div className="text-[11px] text-zinc-500 font-mono">{u.email}</div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="px-2 py-0.5 rounded bg-zinc-100 border border-zinc-200 text-zinc-800 font-bold text-[10px] uppercase">
                        {u.plan}
                      </span>
                      {u.plan !== 'Free' && (
                        <div className="text-[10px] text-zinc-500 mt-1 font-sans">
                          {u.subscriptionStatus?.hasExpiry ? (
                            <span className={u.subscriptionStatus?.isExpired ? 'text-rose-600 font-bold' : u.subscriptionStatus?.daysRemaining <= 5 ? 'text-amber-600 font-bold' : 'text-emerald-600 font-medium'}>
                              {u.subscriptionStatus?.isExpired ? 'Expired' : `${u.subscriptionStatus?.daysRemaining}d left (30d)`}
                            </span>
                          ) : (
                            <span className="text-zinc-400">Active</span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-4 font-bold text-zinc-900">
                      ⚡ {u.credits?.toLocaleString()}
                    </td>
                    <td className="px-5 py-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        u.role === 'superadmin' ? 'bg-zinc-900 text-white' : u.role === 'admin' ? 'bg-zinc-200 text-zinc-800' : 'bg-zinc-100 text-zinc-600 border border-zinc-200'
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        u.status === 'active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}>
                        {u.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-zinc-600">
                      {u._count?.generations || 0}
                    </td>
                    <td className="px-5 py-4 text-[11px] text-zinc-500">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 font-sans">
                        <button
                          onClick={() => handleOpenEditUser(u)}
                          className="px-2.5 py-1 rounded-lg border border-zinc-300 bg-white hover:bg-zinc-50 text-zinc-800 text-xs font-semibold cursor-pointer shadow-xs transition-all active:scale-95"
                        >
                          Edit
                        </button>
                        {u.role !== 'superadmin' && (
                          <button
                            onClick={() => handleDeleteUser(u)}
                            className="px-2.5 py-1 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-semibold cursor-pointer transition-all active:scale-95"
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
              <h2 className="text-lg font-bold text-zinc-900">Platform Generation Moderation</h2>
              <p className="text-xs text-zinc-500">Review all voice clips generated across the platform</p>
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
                className="w-full px-3.5 py-2 rounded-xl border text-xs bg-white border-zinc-300 text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
              />
            </div>
          </div>

          <div className="space-y-3">
            {generations.map((g) => (
              <div key={g.id} className="p-4 rounded-2xl border bg-white border-zinc-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-semibold text-zinc-900 leading-relaxed">{g.text}</p>
                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-zinc-500 mt-2 font-mono">
                    <span className="text-zinc-900 font-medium">User: {g.user?.email || g.deviceId || 'Guest'}</span>
                    <span>•</span>
                    <span className="text-zinc-700 font-semibold">🎙️ {g.referenceVoice}</span>
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
                    className="p-2 rounded-xl border border-zinc-300 bg-white hover:bg-zinc-50 text-zinc-700 hover:text-zinc-900 shadow-xs transition-colors"
                  >
                    <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                  </a>
                  <button
                    onClick={() => handleDeleteGeneration(g.id)}
                    className="p-2 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-600 cursor-pointer transition-colors"
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
          <div className="p-6 sm:p-8 rounded-3xl border bg-white border-zinc-200 shadow-sm">
            <h3 className="text-base font-bold text-zinc-900 mb-1">Global Site & Platform Settings</h3>
            <p className="text-xs text-zinc-500 mb-6">These parameters apply dynamically across the application</p>

            {settingsFeedback && (
              <div className={`mb-4 p-3 rounded-xl text-xs font-semibold ${
                settingsFeedback.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
              }`}>
                {settingsFeedback.text}
              </div>
            )}

            {/* Quick Link Banner to Full Plans Editor */}
            <div className="mb-6 p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-purple-50 via-zinc-50 to-white border border-purple-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
              <div>
                <div className="flex items-center gap-2 text-purple-700 text-xs font-bold uppercase tracking-wider mb-1">
                  <span>💳 Subscription Packages</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-100 border border-purple-200 text-purple-700 font-mono">
                    {plansList.length} Active Tiers
                  </span>
                </div>
                <h4 className="text-sm font-extrabold text-zinc-900">
                  Pricing Plans, Quotas & Features
                </h4>
                <p className="text-xs text-zinc-600 mt-0.5">
                  Configure monthly prices, PKR rates, character allocations, marketing badges & feature lists.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('plans')}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-zinc-900 text-white hover:bg-zinc-800 transition-all shrink-0 cursor-pointer flex items-center justify-center gap-1.5 shadow-sm active:scale-95"
              >
                <span>Edit All Plans & Pricing →</span>
              </button>
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-zinc-800 mb-1.5">
                  Free Starter Credits Allotment (New Signups)
                </label>
                <input
                  type="number"
                  value={settings.free_tier_credits || '2000'}
                  onChange={(e) => setSettings({ ...settings, free_tier_credits: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border text-xs bg-white border-zinc-300 text-zinc-900 font-mono focus:outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
                />
                <span className="text-[11px] text-zinc-500 mt-1 block">Default: 2,000 characters for new registrations.</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-800 mb-1.5">
                  Global Announcement Banner Notice
                </label>
                <input
                  type="text"
                  value={settings.announcement_banner || ''}
                  onChange={(e) => setSettings({ ...settings, announcement_banner: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border text-xs bg-white border-zinc-300 text-zinc-900 focus:outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-800 mb-1.5">
                    Max Script Length (Free Plan)
                  </label>
                  <input
                    type="number"
                    value={settings.max_script_length_free || '2500'}
                    onChange={(e) => setSettings({ ...settings, max_script_length_free: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border text-xs bg-white border-zinc-300 text-zinc-900 font-mono focus:outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-800 mb-1.5">
                    Max Script Length (Paid Plans)
                  </label>
                  <input
                    type="number"
                    value={settings.max_script_length_paid || '15000'}
                    onChange={(e) => setSettings({ ...settings, max_script_length_paid: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border text-xs bg-white border-zinc-300 text-zinc-900 font-mono focus:outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-800 mb-1.5">
                  Maintenance Mode
                </label>
                <select
                  value={settings.maintenance_mode || 'false'}
                  onChange={(e) => setSettings({ ...settings, maintenance_mode: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border text-xs bg-white border-zinc-300 text-zinc-900 focus:outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
                >
                  <option value="false">Disabled (Site Normal)</option>
                  <option value="true">Enabled (Maintenance Banner Active)</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={settingsSaving}
                className="px-6 py-2.5 rounded-xl text-xs font-bold bg-zinc-900 text-white hover:bg-zinc-800 transition-all cursor-pointer disabled:opacity-50 shadow-sm active:scale-95"
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
          <div className="p-6 sm:p-7 rounded-3xl border bg-white border-zinc-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-mono text-purple-700 uppercase tracking-wider mb-1 font-semibold">
                <span>Platform Monetization</span>
                <span>/</span>
                <span className="text-zinc-600 font-bold">Dynamic Subscription Tiers</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-zinc-900 tracking-tight">
                Pricing Plans & Packages Manager
              </h3>
              <p className="text-xs text-zinc-600 mt-1 max-w-2xl">
                Configure plan prices, monthly character quotas, Pakistani Rupee conversion rates, marketing badges, and feature bullet lists. Changes update PostgreSQL and reflect immediately across the Pricing Page, User Dashboard, and JazzCash payment workflows.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={handleAddNewPlan}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-white hover:bg-zinc-50 text-zinc-800 border border-zinc-300 shadow-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                <span>+ Add Plan Tier</span>
              </button>
              <button
                type="button"
                onClick={handleResetPlansToDefaults}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-white hover:bg-zinc-50 text-zinc-600 hover:text-zinc-900 border border-zinc-300 shadow-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                title="Restore default Free, Basic, Silver, Lite, Pro, and Studio configurations"
              >
                <span>↻ Reset Defaults</span>
              </button>
              <button
                type="button"
                onClick={() => handleSaveAllPlans()}
                disabled={plansSaving}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-zinc-900 text-white hover:bg-zinc-800 transition-all flex items-center gap-1.5 shadow-sm cursor-pointer active:scale-95 disabled:opacity-50"
              >
                <span>{plansSaving ? 'Saving to Database...' : '💾 Save All Plans Changes'}</span>
              </button>
            </div>
          </div>

          {/* Feedback Message */}
          {plansFeedback && (
            <div className={`p-4 rounded-2xl text-xs font-semibold flex items-center justify-between gap-3 ${
              plansFeedback.type === 'success'
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-rose-50 text-rose-700 border border-rose-200'
            }`}>
              <span>{plansFeedback.text}</span>
              <button onClick={() => setPlansFeedback(null)} className="text-zinc-500 hover:text-zinc-900 font-bold">✕</button>
            </div>
          )}

          {/* Plan Selector Grid */}
          <div className={`grid grid-cols-1 sm:grid-cols-2 ${plansList.length >= 5 ? 'lg:grid-cols-3 xl:grid-cols-5' : 'lg:grid-cols-4'} gap-4`}>
            {plansList.map((p) => {
              const isSelected = (selectedPlanId || plansList[0]?.id) === p.id;
              return (
                <div
                  key={p.id}
                  onClick={() => setSelectedPlanId(p.id)}
                  className={`p-5 rounded-2xl border transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between ${
                    isSelected
                      ? 'bg-purple-50/80 border-purple-500 ring-2 ring-purple-500/20 shadow-sm'
                      : 'bg-white border-zinc-200 hover:border-zinc-300 shadow-xs'
                  }`}
                >
                  {p.badge && (
                    <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-purple-100 text-purple-800 border border-purple-200 text-center leading-tight">
                      {p.badge}
                    </div>
                  )}

                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold font-mono text-zinc-500 uppercase">{p.id}</span>
                      {p.highlight && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 font-bold border border-amber-200">
                          ★ Featured
                        </span>
                      )}
                    </div>
                    <h4 className="text-base font-extrabold text-zinc-900 truncate">{p.name}</h4>
                    <div className="mt-2 flex items-baseline gap-1">
                      <span className="text-2xl font-black text-zinc-900">
                        {p.priceMonthly === 0 ? 'FREE' : (p.displayPrice || `PKR ${Number(p.priceMonthly).toLocaleString()}`)}
                      </span>
                      {p.priceMonthly > 0 && <span className="text-xs text-zinc-500">/mo</span>}
                    </div>
                    <div className="text-[11px] text-zinc-500 font-mono mt-0.5">
                      {p.pricePKR || (p.priceMonthly === 0 ? 'FREE' : `PKR ${Number(p.priceMonthly).toLocaleString()}`)}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-zinc-200 flex items-center justify-between text-xs">
                    <span className="font-mono text-emerald-600 text-[11px] font-bold">
                      ⚡ {(p.creditCount || 0).toLocaleString()} chars
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      p.isEnabled !== false ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-zinc-100 text-zinc-600 border border-zinc-200'
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
              <div className="p-6 sm:p-8 rounded-3xl border bg-white border-zinc-200 shadow-sm space-y-8">
                {/* Editor Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-zinc-200">
                  <div>
                    <div className="flex items-center gap-2 text-xs font-mono text-zinc-500 mb-1">
                      <span>Editing Package</span>
                      <span>•</span>
                      <span className="text-purple-700 font-bold">{currentPlan.id}</span>
                    </div>
                    <h3 className="text-xl font-bold text-zinc-900 flex items-center gap-2">
                      <span>{currentPlan.name}</span>
                      <span className="text-xs font-normal text-zinc-500 font-mono">({currentPlan.id})</span>
                    </h3>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleDeletePlan(currentPlan.id)}
                      className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition-all cursor-pointer"
                    >
                      Delete This Tier
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSaveAllPlans()}
                      disabled={plansSaving}
                      className="px-4 py-2 rounded-xl text-xs font-bold bg-zinc-900 text-white hover:bg-zinc-800 transition-all cursor-pointer active:scale-95 disabled:opacity-50 shadow-sm"
                    >
                      {plansSaving ? 'Saving...' : 'Save Plan Changes'}
                    </button>
                  </div>
                </div>

                {/* Form Sections */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* SECTION 1: Identity & Presentation */}
                  <div className="p-5 rounded-2xl bg-zinc-50 border border-zinc-200 space-y-4">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-purple-700 font-mono">
                      1. Identification & Badges
                    </h4>

                    <div>
                      <label className="block text-xs font-bold text-zinc-800 mb-1">
                        Plan Key / Identifier <span className="text-zinc-500 text-[10px] font-normal">(Unique database key, e.g. Free, Basic, Silver, Lite, Pro, Studio)</span>
                      </label>
                      <input
                        type="text"
                        value={currentPlan.id || ''}
                        onChange={(e) => updatePlanField(currentPlan.id, 'id', e.target.value)}
                        className="w-full px-3.5 py-2 rounded-xl border text-xs bg-white border-zinc-300 text-zinc-900 font-mono focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-zinc-800 mb-1">
                        Display Name <span className="text-zinc-500 text-[10px] font-normal">(User-facing title on pricing cards)</span>
                      </label>
                      <input
                        type="text"
                        value={currentPlan.name || ''}
                        onChange={(e) => updatePlanField(currentPlan.id, 'name', e.target.value)}
                        className="w-full px-3.5 py-2 rounded-xl border text-xs bg-white border-zinc-300 text-zinc-900 focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-zinc-800 mb-1">
                        Marketing Badge / Ribbon <span className="text-zinc-500 text-[10px] font-normal">(e.g. Most Popular, Best Value, 20% OFF, or leave blank)</span>
                      </label>
                      <input
                        type="text"
                        value={currentPlan.badge || ''}
                        placeholder="Leave blank for no badge"
                        onChange={(e) => updatePlanField(currentPlan.id, 'badge', e.target.value)}
                        className="w-full px-3.5 py-2 rounded-xl border text-xs bg-white border-zinc-300 text-zinc-900 focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
                      />
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 pt-2">
                      <label className="flex items-center gap-2.5 text-xs text-zinc-800 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={currentPlan.highlight || false}
                          onChange={(e) => updatePlanField(currentPlan.id, 'highlight', e.target.checked)}
                          className="w-4 h-4 rounded bg-white border-zinc-300 text-purple-600 focus:ring-0 cursor-pointer"
                        />
                        <span className="font-bold">Featured / Highlighted Card</span>
                      </label>

                      <label className="flex items-center gap-2.5 text-xs text-zinc-800 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={currentPlan.isEnabled !== false}
                          onChange={(e) => updatePlanField(currentPlan.id, 'isEnabled', e.target.checked)}
                          className="w-4 h-4 rounded bg-white border-zinc-300 text-purple-600 focus:ring-0 cursor-pointer"
                        />
                        <span className="font-bold">Active / Visible to Users</span>
                      </label>
                    </div>
                  </div>

                  {/* SECTION 2: Pricing & Currency */}
                  <div className="p-5 rounded-2xl bg-zinc-50 border border-zinc-200 space-y-4">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-700 font-mono">
                      2. PRICING & CURRENCY RATES (PKR)
                    </h4>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-zinc-800 mb-1">
                          Monthly Price (PKR)
                        </label>
                        <input
                          type="number"
                          step="1"
                          value={currentPlan.priceMonthly ?? 0}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            updatePlanField(currentPlan.id, 'priceMonthly', val);
                            if (!currentPlan.pricePKR || currentPlan.pricePKR.startsWith('PKR')) {
                              updatePlanField(currentPlan.id, 'pricePKR', `PKR ${val.toLocaleString()}`);
                            }
                          }}
                          className="w-full px-3.5 py-2 rounded-xl border text-xs bg-white border-zinc-300 text-zinc-900 font-mono focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-zinc-800 mb-1">
                          Annual Price (PKR / mo)
                        </label>
                        <input
                          type="number"
                          step="1"
                          value={currentPlan.priceAnnual ?? 0}
                          onChange={(e) => updatePlanField(currentPlan.id, 'priceAnnual', parseFloat(e.target.value) || 0)}
                          className="w-full px-3.5 py-2 rounded-xl border text-xs bg-white border-zinc-300 text-zinc-900 font-mono focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-zinc-800 mb-1">
                        Pakistani Rupee Price (PKR) <span className="text-zinc-500 text-[10px] font-normal">(Used in JazzCash transfer prompts)</span>
                      </label>
                      <input
                        type="text"
                        value={currentPlan.pricePKR || ''}
                        onChange={(e) => updatePlanField(currentPlan.id, 'pricePKR', e.target.value)}
                        placeholder="e.g. PKR 2,800"
                        className="w-full px-3.5 py-2 rounded-xl border text-xs bg-white border-zinc-300 text-zinc-900 font-mono focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-zinc-800 mb-1">
                        Display Price Tag <span className="text-zinc-500 text-[10px] font-normal">(Header text, e.g. FREE, PKR 2,800, PKR 4,750)</span>
                      </label>
                      <input
                        type="text"
                        value={currentPlan.displayPrice || ''}
                        onChange={(e) => updatePlanField(currentPlan.id, 'displayPrice', e.target.value)}
                        placeholder="e.g. FREE or PKR 2,800"
                        className="w-full px-3.5 py-2 rounded-xl border text-xs bg-white border-zinc-300 text-zinc-900 font-mono focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
                      />
                    </div>
                  </div>

                  {/* SECTION 3: Quotas & Character Limits */}
                  <div className="p-5 rounded-2xl bg-zinc-50 border border-zinc-200 space-y-4">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-pink-700 font-mono">
                      3. Balances & Synthesis Limits
                    </h4>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-zinc-800 mb-1">
                          Characters / Credits Allotment
                        </label>
                        <input
                          type="number"
                          value={currentPlan.creditCount ?? 2000}
                          onChange={(e) => updatePlanField(currentPlan.id, 'creditCount', parseInt(e.target.value, 10) || 0)}
                          className="w-full px-3.5 py-2 rounded-xl border text-xs bg-white border-zinc-300 text-zinc-900 font-mono focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-zinc-800 mb-1">
                          Display Credits Text
                        </label>
                        <input
                          type="text"
                          value={currentPlan.credits || ''}
                          onChange={(e) => updatePlanField(currentPlan.id, 'credits', e.target.value)}
                          placeholder="e.g. 500,000 credits"
                          className="w-full px-3.5 py-2 rounded-xl border text-xs bg-white border-zinc-300 text-zinc-900 focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-zinc-800 mb-1">
                          Max Chars / Gen
                        </label>
                        <input
                          type="number"
                          value={currentPlan.maxCharsPerGen ?? 5000}
                          onChange={(e) => updatePlanField(currentPlan.id, 'maxCharsPerGen', parseInt(e.target.value, 10) || 1000)}
                          className="w-full px-3 py-2 rounded-xl border text-xs bg-white border-zinc-300 text-zinc-900 font-mono focus:border-zinc-900 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-zinc-800 mb-1">
                          Voice Clones
                        </label>
                        <input
                          type="number"
                          value={currentPlan.customVoicesCount ?? 0}
                          onChange={(e) => updatePlanField(currentPlan.id, 'customVoicesCount', parseInt(e.target.value, 10) || 0)}
                          className="w-full px-3 py-2 rounded-xl border text-xs bg-white border-zinc-300 text-zinc-900 font-mono focus:border-zinc-900 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-zinc-800 mb-1">
                          Queued Tasks
                        </label>
                        <input
                          type="number"
                          value={currentPlan.maxQueuedTasks ?? 1}
                          onChange={(e) => updatePlanField(currentPlan.id, 'maxQueuedTasks', parseInt(e.target.value, 10) || 1)}
                          className="w-full px-3 py-2 rounded-xl border text-xs bg-white border-zinc-300 text-zinc-900 font-mono focus:border-zinc-900 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* SECTION 4: Copy & Call To Action */}
                  <div className="p-5 rounded-2xl bg-zinc-50 border border-zinc-200 space-y-4">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-700 font-mono">
                      4. Description & Call to Action
                    </h4>

                    <div>
                      <label className="block text-xs font-bold text-zinc-800 mb-1">
                        Plan Summary Description
                      </label>
                      <textarea
                        rows="2"
                        value={currentPlan.desc || ''}
                        onChange={(e) => updatePlanField(currentPlan.id, 'desc', e.target.value)}
                        className="w-full px-3.5 py-2 rounded-xl border text-xs bg-white border-zinc-300 text-zinc-900 focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-zinc-800 mb-1">
                        Call-to-Action (CTA) Button Text
                      </label>
                      <input
                        type="text"
                        value={currentPlan.buttonText || ''}
                        onChange={(e) => updatePlanField(currentPlan.id, 'buttonText', e.target.value)}
                        placeholder="e.g. Subscribe to Lite, Upgrade to Pro"
                        className="w-full px-3.5 py-2 rounded-xl border text-xs bg-white border-zinc-300 text-zinc-900 focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
                      />
                    </div>
                  </div>
                </div>

                {/* SECTION 5: Feature Checklist (Bullet Points) */}
                <div className="p-6 rounded-2xl bg-zinc-50 border border-zinc-200 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-amber-700 font-mono">
                        5. Feature Checklist & Bullet Points
                      </h4>
                      <p className="text-xs text-zinc-600 mt-0.5">
                        These bullet points are rendered on the pricing page card for this plan.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => addPlanFeature(currentPlan.id)}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white hover:bg-zinc-100 text-zinc-800 border border-zinc-300 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
                    >
                      <span>+ Add Feature Bullet</span>
                    </button>
                  </div>

                  <div className="space-y-2.5 pt-2">
                    {(currentPlan.features || []).map((feat, fIdx) => (
                      <div key={fIdx} className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-zinc-200 text-zinc-700 text-[11px] font-mono flex items-center justify-center shrink-0">
                          {fIdx + 1}
                        </span>
                        <input
                          type="text"
                          value={feat}
                          onChange={(e) => updatePlanFeature(currentPlan.id, fIdx, e.target.value)}
                          className="flex-1 px-3.5 py-2 rounded-xl border text-xs bg-white border-zinc-300 text-zinc-900 focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
                          placeholder="Feature description bullet point..."
                        />
                        <button
                          type="button"
                          onClick={() => removePlanFeature(currentPlan.id, fIdx)}
                          className="w-8 h-8 rounded-xl bg-white hover:bg-rose-50 text-zinc-400 hover:text-rose-600 border border-zinc-200 flex items-center justify-center shrink-0 transition-all cursor-pointer"
                          title="Remove this feature bullet"
                        >
                          ✕
                        </button>
                      </div>
                    ))}

                    {(currentPlan.features || []).length === 0 && (
                      <div className="p-4 rounded-xl border border-dashed border-zinc-300 text-center text-xs text-zinc-500">
                        No feature bullets defined yet. Click "+ Add Feature Bullet" to add one.
                      </div>
                    )}
                  </div>
                </div>

                {/* Bottom Global Action Banner */}
                <div className="pt-4 border-t border-zinc-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="text-xs text-zinc-600">
                    Editing <span className="text-zinc-900 font-bold">{currentPlan.name}</span>. Remember to save all changes to commit them to the live PostgreSQL database.
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => handleSaveAllPlans()}
                      disabled={plansSaving}
                      className="px-6 py-2.5 rounded-xl text-xs font-bold bg-zinc-900 text-white hover:bg-zinc-800 transition-all cursor-pointer shadow-sm active:scale-95 disabled:opacity-50"
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
          <div className="p-6 sm:p-8 rounded-3xl border bg-white border-zinc-200 shadow-sm">
            <h3 className="text-base font-bold text-zinc-900 mb-1">Superadmin Security Configuration</h3>
            <p className="text-xs text-zinc-500 mb-6">Environment-based master administrative access</p>

            <div className="space-y-4 text-xs font-mono">
              <div className="p-4 rounded-2xl border bg-zinc-50 border-zinc-200">
                <span className="text-[11px] text-zinc-500 uppercase tracking-wider block font-sans font-bold mb-1">
                  Configured Superadmin Email
                </span>
                <span className="text-zinc-900 text-sm font-bold font-mono">admin@voiceclonestudio.com</span>
              </div>

              <div className="p-4 rounded-2xl border bg-zinc-50 border-zinc-200">
                <span className="text-[11px] text-zinc-500 uppercase tracking-wider block font-sans font-bold mb-1">
                  Active Role Privileges
                </span>
                <span className="text-emerald-600 text-sm font-bold">superadmin (Master Level)</span>
              </div>

              <div className="p-4 rounded-2xl border bg-zinc-50 border-zinc-200">
                <span className="text-[11px] text-zinc-500 uppercase tracking-wider block font-sans font-bold mb-1">
                  Security Protocol & Rotation Guide
                </span>
                <p className="text-zinc-600 font-sans text-xs leading-relaxed mt-1">
                  Superadmin credentials are seeded from your backend <code className="bg-zinc-200 px-1.5 py-0.5 rounded text-zinc-900 font-mono">.env</code> file (<code className="text-zinc-800 font-mono">SUPERADMIN_EMAIL</code> and <code className="text-zinc-800 font-mono">SUPERADMIN_PASSWORD</code>). To rotate the password, update the value in <code className="bg-zinc-200 px-1.5 py-0.5 rounded text-zinc-900 font-mono">.env</code> (or Railway Service Variables in production) and restart the server.
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
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-rose-50 text-rose-700 border border-rose-200'
            }`}>
              <span>{actionFeedback.text}</span>
              <button onClick={() => setActionFeedback(null)} className="text-zinc-500 hover:text-zinc-900 font-bold">✕</button>
            </div>
          )}

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl border bg-white border-zinc-200 shadow-sm">
              <span className="text-[11px] uppercase font-bold text-zinc-500">JazzCash Account</span>
              <p className="text-sm font-bold text-zinc-900 mt-1 font-mono">03037108440</p>
              <span className="text-[10px] text-zinc-400">Title: AROSA</span>
            </div>
            <div className="p-5 rounded-2xl border bg-white border-zinc-200 shadow-sm">
              <span className="text-[11px] uppercase font-bold text-zinc-500">Pending Review</span>
              <p className="text-2xl font-mono font-bold text-amber-600 mt-1">{pendingPaymentsCount}</p>
              <span className="text-[10px] text-zinc-400">Awaiting Admin Verification</span>
            </div>
            <div className="p-5 rounded-2xl border bg-white border-zinc-200 shadow-sm">
              <span className="text-[11px] uppercase font-bold text-zinc-500">Total Submissions</span>
              <p className="text-2xl font-mono font-bold text-zinc-900 mt-1">{payments.length}</p>
              <span className="text-[10px] text-zinc-400">All Time</span>
            </div>
            <div className="p-5 rounded-2xl border bg-white border-zinc-200 shadow-sm">
              <span className="text-[11px] uppercase font-bold text-zinc-500">Approved Payments</span>
              <p className="text-2xl font-mono font-bold text-emerald-600 mt-1">
                {payments.filter(p => p.status === 'approved').length}
              </p>
              <span className="text-[10px] text-zinc-400">Upgraded Users</span>
            </div>
          </div>

          {/* Table Container */}
          <div className="rounded-3xl border bg-white border-zinc-200 shadow-sm overflow-hidden">
            {/* Filter controls */}
            <div className="p-5 border-b border-zinc-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <img src="/jazzcash.webp" alt="JazzCash" className="w-6 h-6 object-contain rounded" />
                <h3 className="text-sm font-bold text-zinc-900">Manual Payment Approval Queue</h3>
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
                        ? 'bg-zinc-900 text-white shadow-sm'
                        : 'bg-white text-zinc-600 hover:text-zinc-900 border border-zinc-300 shadow-xs'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
                <button
                  onClick={fetchPayments}
                  disabled={paymentsLoading}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white hover:bg-zinc-50 text-zinc-800 border border-zinc-300 shadow-xs transition-all cursor-pointer"
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
                <table className="w-full text-left text-xs text-zinc-800">
                  <thead>
                    <tr className="border-b border-zinc-200 text-zinc-500 bg-zinc-50 font-semibold text-[11px] uppercase tracking-wider">
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
                  <tbody className="divide-y divide-zinc-200 font-mono">
                    {payments.map((p) => {
                      const isProcessing = actionProcessingId === p.id;
                      const screenshotUrl = p.screenshotUrl
                        ? (p.screenshotUrl.startsWith('http') ? p.screenshotUrl : `${API_BASE}${p.screenshotUrl}`)
                        : null;

                      return (
                        <tr key={p.id} className="hover:bg-zinc-50/80 transition-colors">
                          <td className="py-4 px-5 font-sans">
                            <span className="font-bold text-zinc-900 block text-xs">{p.user?.name || 'User'}</span>
                            <span className="text-[11px] text-zinc-500 font-mono block">{p.user?.email}</span>
                            <span className="text-[10px] text-zinc-400 block">Current: {p.user?.plan || 'Free'} ({p.user?.credits?.toLocaleString() || 0} creds)</span>
                          </td>

                          <td className="py-4 px-4 font-sans">
                            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-zinc-100 border border-zinc-200 text-zinc-800 block w-fit mb-1">
                              {p.planType} Plan
                            </span>
                            <span className="text-[10px] text-emerald-600 font-mono font-semibold">
                              +{p.planType === 'Basic' ? '100,000' : p.planType === 'Silver' ? '250,000' : p.planType === 'Lite' ? '500,000' : p.planType === 'Pro' ? '1,000,000' : '3,000,000'} chars
                            </span>
                          </td>

                          <td className="py-4 px-4">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-zinc-900 tracking-wider select-all">{p.transactionId}</span>
                              <button
                                onClick={() => navigator.clipboard.writeText(p.transactionId)}
                                title="Copy TID"
                                className="text-zinc-400 hover:text-zinc-900 text-xs cursor-pointer"
                              >
                                📋
                              </button>
                            </div>
                            <span className="text-[10px] text-zinc-500 font-sans block">{p.amount || 'PKR Standard'}</span>
                          </td>

                          <td className="py-4 px-4 text-zinc-800">
                            {p.senderNumber || <span className="text-zinc-400 font-sans text-[11px]">Not Provided</span>}
                          </td>

                          <td className="py-4 px-4 font-sans">
                            {screenshotUrl ? (
                              <button
                                type="button"
                                onClick={() => setPreviewScreenshotUrl(screenshotUrl)}
                                className="group relative inline-block rounded-lg overflow-hidden border border-zinc-300 hover:border-zinc-500 transition-all cursor-pointer shadow-xs"
                              >
                                <img
                                  src={screenshotUrl}
                                  alt="Screenshot Preview"
                                  className="w-14 h-10 object-cover bg-zinc-100"
                                  onError={(e) => {
                                    e.target.style.display = 'none';
                                  }}
                                />
                                <span className="absolute inset-0 bg-black/60 flex items-center justify-center text-[10px] text-white opacity-0 group-hover:opacity-100 transition-opacity font-bold">
                                  🔍 Zoom
                                </span>
                              </button>
                            ) : (
                              <span className="text-zinc-400 text-[11px]">No Screenshot</span>
                            )}
                          </td>

                          <td className="py-4 px-4 text-zinc-600 text-[11px] font-sans">
                            {new Date(p.createdAt).toLocaleDateString()}
                            <span className="text-[10px] text-zinc-400 block font-mono">
                              {new Date(p.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </td>

                          <td className="py-4 px-4 font-sans">
                            {p.status === 'approved' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                ✓ Approved
                              </span>
                            )}
                            {p.status === 'pending' && (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200 animate-pulse">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                                Pending Review
                              </span>
                            )}
                            {p.status === 'rejected' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                ✕ Rejected
                              </span>
                            )}
                            {p.adminNotes && (
                              <span className="text-[10px] text-zinc-500 block mt-1 max-w-[160px] truncate" title={p.adminNotes}>
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
                                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs transition-all cursor-pointer disabled:opacity-50 active:scale-95"
                                >
                                  {isProcessing ? 'Saving...' : '✓ Approve'}
                                </button>
                                <button
                                  type="button"
                                  disabled={isProcessing}
                                  onClick={() => handleRejectPayment(p.id)}
                                  className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-all cursor-pointer disabled:opacity-50 active:scale-95"
                                >
                                  Reject
                                </button>
                              </div>
                            ) : p.status === 'approved' ? (
                              <span className="text-[11px] font-bold text-emerald-600">
                                Completed
                              </span>
                            ) : (
                              <button
                                type="button"
                                disabled={isProcessing}
                                onClick={() => handleApprovePayment(p.id)}
                                className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-white hover:bg-zinc-50 text-zinc-800 border border-zinc-300 shadow-xs cursor-pointer transition-all active:scale-95"
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
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border p-6 sm:p-8 bg-white border-zinc-200 text-zinc-900 shadow-2xl relative">
            <h3 className="text-lg font-bold text-zinc-900 mb-1">Edit User Profile & Access</h3>
            <p className="text-xs text-zinc-500 font-mono mb-4">{editingUser.email}</p>

            <form onSubmit={handleSaveUser} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-800 mb-1">Plan Subscription</label>
                <select
                  value={editPlan}
                  onChange={(e) => setEditPlan(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border text-xs bg-white border-zinc-300 text-zinc-900 focus:outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
                >
                  <option value="Free">Free Plan</option>
                  <option value="Basic">Basic Plan</option>
                  <option value="Silver">Silver Plan</option>
                  <option value="Lite">Lite Plan</option>
                  <option value="Pro">Pro Plan</option>
                  <option value="Studio">Studio Plan</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-800 mb-1">Credits Allocation</label>
                <input
                  type="number"
                  value={editCredits}
                  onChange={(e) => setEditCredits(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border text-xs bg-white border-zinc-300 text-zinc-900 font-mono focus:outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-800 mb-1">Account Role</label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border text-xs bg-white border-zinc-300 text-zinc-900 focus:outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                  <option value="superadmin">Superadmin</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-800 mb-1">Account Status</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border text-xs bg-white border-zinc-300 text-zinc-900 focus:outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
                >
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>

              {editPlan !== 'Free' && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-zinc-800">Credit Expiry Date (30 Days)</label>
                    <button
                      type="button"
                      onClick={() => {
                        const d = new Date();
                        d.setDate(d.getDate() + 30);
                        setEditExpiry(d.toISOString().split('T')[0]);
                      }}
                      className="text-[10px] font-bold text-amber-600 hover:text-amber-700 transition-colors cursor-pointer"
                    >
                      ⚡ Set 30 Days From Today
                    </button>
                  </div>
                  <input
                    type="date"
                    value={editExpiry}
                    onChange={(e) => setEditExpiry(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border text-xs bg-white border-zinc-300 text-zinc-900 font-mono focus:outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
                  />
                  <p className="text-[10px] text-zinc-500 mt-1">
                    Purchased character credits expire 30 days after activation.
                  </p>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-600 hover:text-zinc-900 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSaving}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-zinc-900 text-white hover:bg-zinc-800 cursor-pointer disabled:opacity-50 shadow-sm active:scale-95 transition-all"
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
          className="fixed inset-0 z-[140] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn"
          onClick={() => setPreviewScreenshotUrl(null)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] bg-white border border-zinc-200 rounded-3xl overflow-hidden shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-200 bg-zinc-50">
              <div className="flex items-center gap-2">
                <img src="/jazzcash.webp" alt="JazzCash" className="w-5 h-5 object-contain rounded" />
                <span className="text-xs font-bold text-zinc-900">Payment Receipt Proof (Original Upload)</span>
              </div>
              <button
                type="button"
                onClick={() => setPreviewScreenshotUrl(null)}
                className="text-zinc-600 hover:text-zinc-900 text-xs font-bold px-2.5 py-1 rounded-lg bg-white border border-zinc-300 shadow-xs cursor-pointer transition-all active:scale-95"
              >
                ✕ Close
              </button>
            </div>
            <div className="p-4 flex items-center justify-center overflow-auto max-h-[78vh] bg-zinc-100">
              <img
                src={previewScreenshotUrl}
                alt="Payment Receipt Large"
                className="max-w-full max-h-[72vh] rounded-xl object-contain shadow-md border border-zinc-300"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
