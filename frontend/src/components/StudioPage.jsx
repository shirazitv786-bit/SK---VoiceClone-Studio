import React, { useState, useEffect, useRef, useMemo } from 'react';
import axios from 'axios';

// Backend API URL
const API_BASE = typeof window !== 'undefined' && window.location.port === '5173' ? 'http://localhost:5000' : '';

// Unique anonymous device token helper
const getDeviceId = () => {
  const DEVICE_ID_KEY = 'sk_voiceclone_device_id';
  let devId = null;
  try {
    devId = localStorage.getItem(DEVICE_ID_KEY);
    if (!devId) {
      devId = 'dev_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 10);
      localStorage.setItem(DEVICE_ID_KEY, devId);
    }
  } catch (e) {
    devId = 'dev_temp_' + Math.random().toString(36).substring(2, 10);
  }
  return devId;
};

export default function StudioPage({
  user,
  onDeductCredits,
  onNavigate,
  onOpenManualPayment,
  theme: customTheme,
  serverOnline,
  dynamicPlans,
  onRefreshUser
}) {
  // TTS Generation States
  const [text, setText] = useState('');
  const [referenceVoice, setReferenceVoice] = useState('Adam (Deep Narration - ElevenLabs Style).wav');
  const [loading, setLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const [availableVoices, setAvailableVoices] = useState([]);
  const [voiceRegistry, setVoiceRegistry] = useState([]);
  const [errorMessage, setErrorMessage] = useState(null);

  // Custom Voice Upload States
  const [uploadFile, setUploadFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadFeedback, setUploadFeedback] = useState(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const fileInputRef = useRef(null);

  // User-scoped Local Storage History Management (Strictly Browser-Side Only)
  const getUserStorageKey = (u) => {
    if (u?.id) return `sk_history_user_${u.id}`;
    if (u?.email) return `sk_history_user_${String(u.email).toLowerCase().replace(/[^a-z0-9_]/g, '_')}`;
    return 'sk_history_guest';
  };

  const getPendingJobKey = (u) => {
    if (u?.id) return `sk_pending_job_${u.id}`;
    if (u?.email) return `sk_pending_job_${String(u.email).toLowerCase().replace(/[^a-z0-9_]/g, '_')}`;
    return 'sk_pending_job_guest';
  };

  const getQueueStorageKey = (u) => {
    if (u?.id) return `sk_queue_user_${u.id}`;
    if (u?.email) return `sk_queue_user_${String(u.email).toLowerCase().replace(/[^a-z0-9_]/g, '_')}`;
    return 'sk_queue_guest';
  };

  const loadUserQueue = (u) => {
    try {
      const key = getQueueStorageKey(u);
      const saved = localStorage.getItem(key);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {}
    return [];
  };

  const saveUserQueue = (u, items) => {
    try {
      const key = getQueueStorageKey(u);
      localStorage.setItem(key, JSON.stringify(items));
    } catch (e) {}
  };


  const loadUserHistory = (u) => {
    try {
      // Clear legacy shared global history key so previous server records never appear
      localStorage.removeItem('sk_voiceclone_studio_history');

      const key = getUserStorageKey(u);
      const saved = localStorage.getItem(key);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const currentUserId = u?.id || null;
          return parsed.filter((item) => {
            if (currentUserId) {
              return item.userId === currentUserId;
            }
            return !item.userId;
          });
        }
      }
    } catch (e) {
      console.warn('Failed to read local history:', e);
    }
    return [];
  };

  const saveUserHistory = (u, items) => {
    try {
      const key = getUserStorageKey(u);
      localStorage.setItem(key, JSON.stringify(items.slice(0, 50)));
    } catch (e) {
      console.warn('Failed to save local history:', e);
    }
  };

  const [history, setHistory] = useState(() => loadUserHistory(user));
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [searchHistory, setSearchHistory] = useState('');
  const [playingHistoryId, setPlayingHistoryId] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);
  const audioPlayerRef = useRef(null);

  // Studio Voice Synthesis Queue States
  const [queue, setQueue] = useState(() => loadUserQueue(user));
  const queueRef = useRef(queue);
  queueRef.current = queue;

  const [activeJob, setActiveJob] = useState(null);
  const activeJobRef = useRef(activeJob);
  activeJobRef.current = activeJob;

  const isSynthesizingRef = useRef(false);
  const executeSynthesisRef = useRef(null);

  // Switch history & queue immediately when active user logs in, logs out, or switches accounts
  useEffect(() => {
    setLoadingHistory(true);
    setHistory(loadUserHistory(user));
    setQueue(loadUserQueue(user));
    setPlayingHistoryId(null);
    setTimeout(() => setLoadingHistory(false), 50);
  }, [user?.id, user?.email]);


  // Preload script if user clicked "Re-Synthesize" from their Dashboard
  useEffect(() => {
    try {
      const preload = localStorage.getItem('sk_voiceclone_preload_script');
      if (preload) {
        const data = JSON.parse(preload);
        if (data.text) setText(data.text);
        if (data.voice) setReferenceVoice(data.voice);
        if (data.speed !== undefined) setSpeed(data.speed);
        if (data.pitch !== undefined) setPitch(data.pitch);
        if (data.pause !== undefined) setPause(data.pause);
        localStorage.removeItem('sk_voiceclone_preload_script');
      }
    } catch (e) {}
  }, []);

  // Resume in-progress synthesis and queue engine if user refreshed the browser or navigated away
  useEffect(() => {
    let pollInterval = null;
    let isCancelled = false;

    const checkAndResumePendingJob = async () => {
      try {
        const pendingKey = getPendingJobKey(user);
        const saved = localStorage.getItem(pendingKey);
        if (!saved) {
          const currentQueue = loadUserQueue(user);
          if (currentQueue && currentQueue.length > 0 && !isSynthesizingRef.current) {
            const nextJob = currentQueue[0];
            const remainingQueue = currentQueue.slice(1);
            setQueue(remainingQueue);
            saveUserQueue(user, remainingQueue);
            setTimeout(() => {
              if (executeSynthesisRef.current) executeSynthesisRef.current(nextJob);
            }, 300);
          }
          return;
        }

        const pending = JSON.parse(saved);
        if (!pending || !pending.jobId) {
          localStorage.removeItem(pendingKey);
          const currentQueue = loadUserQueue(user);
          if (currentQueue && currentQueue.length > 0 && !isSynthesizingRef.current) {
            const nextJob = currentQueue[0];
            const remainingQueue = currentQueue.slice(1);
            setQueue(remainingQueue);
            saveUserQueue(user, remainingQueue);
            setTimeout(() => {
              if (executeSynthesisRef.current) executeSynthesisRef.current(nextJob);
            }, 300);
          }
          return;
        }

        const ageMs = Date.now() - (pending.startedAt || 0);
        if (ageMs > 10 * 60 * 1000) {
          localStorage.removeItem(pendingKey);
          const currentQueue = loadUserQueue(user);
          if (currentQueue && currentQueue.length > 0 && !isSynthesizingRef.current) {
            const nextJob = currentQueue[0];
            const remainingQueue = currentQueue.slice(1);
            setQueue(remainingQueue);
            saveUserQueue(user, remainingQueue);
            setTimeout(() => {
              if (executeSynthesisRef.current) executeSynthesisRef.current(nextJob);
            }, 300);
          }
          return;
        }

        console.log(`[Studio] Reconnected to active synthesis: ${pending.jobId}`);
        setLoading(true);
        setActiveJob({
          id: pending.jobId,
          text: pending.text,
          voiceName: pending.voiceName || pending.referenceVoice?.replace('.wav', '') || 'Voice Model',
          referenceVoice: pending.referenceVoice,
          startedAt: pending.startedAt
        });

        // Ensure optimistic generating card appears in history
        setHistory((prev) => {
          if (prev.some((item) => item.id === pending.jobId)) return prev;
          const card = {
            id: pending.jobId,
            userId: user?.id || null,
            userEmail: user?.email || null,
            deviceId: getDeviceId(),
            timestamp: new Date(pending.startedAt || Date.now()).toISOString(),
            text: pending.text ? (pending.text.length > 120 ? pending.text.substring(0, 120) + '...' : pending.text) : 'Synthesizing voice...',
            referenceVoice: pending.referenceVoice,
            status: 'generating'
          };
          return [card, ...prev];
        });

        const token = localStorage.getItem('sk_voiceclone_auth_token');
        const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

        const pollStatus = async () => {
          if (isCancelled) return;
          try {
            const res = await axios.get(`${API_BASE}/api/job-status/${pending.jobId}`, {
              headers: authHeaders
            });

            if (res.data && res.data.success && res.data.job) {
              const job = res.data.job;

              if (job.status === 'completed' && job.audioUrl) {
                if (pollInterval) clearInterval(pollInterval);
                try { localStorage.removeItem(pendingKey); } catch (e) {}

                const fullUrl = `${API_BASE}${job.audioUrl}`;
                setAudioUrl(fullUrl);
                setActiveJob(null);

                const newRecord = {
                  id: job.id || pending.jobId,
                  userId: user?.id || null,
                  userEmail: user?.email || null,
                  deviceId: getDeviceId(),
                  timestamp: new Date().toISOString(),
                  text: pending.text ? (pending.text.length > 120 ? pending.text.substring(0, 120) + '...' : pending.text) : 'Synthesized audio',
                  referenceVoice: pending.referenceVoice || job.referenceVoice,
                  audioUrl: job.audioUrl,
                  speed: pending.speed,
                  pitch: pending.pitch,
                  pause: pending.pause,
                  status: 'ready'
                };

                setHistory((prev) => {
                  const updated = [newRecord, ...prev.filter((i) => i.id !== pending.jobId && i.id !== newRecord.id)];
                  saveUserHistory(user, updated);
                  return updated;
                });

                if (job.remainingCredits !== undefined && job.remainingCredits !== null) {
                  if (onDeductCredits) onDeductCredits(job.remainingCredits, true);
                } else if (pending.text && onDeductCredits) {
                  onDeductCredits(pending.text.length, false);
                }
                if (onRefreshUser) onRefreshUser();

                setTimeout(() => {
                  if (audioPlayerRef.current) {
                    audioPlayerRef.current.play().catch(() => {});
                  }
                }, 200);

                // Check and trigger next queued synthesis
                const currentQueue = queueRef.current;
                if (currentQueue && currentQueue.length > 0) {
                  const nextJob = currentQueue[0];
                  const remainingQueue = currentQueue.slice(1);
                  setQueue(remainingQueue);
                  saveUserQueue(user, remainingQueue);
                  setTimeout(() => {
                    executeSynthesis(nextJob);
                  }, 300);
                } else {
                  setLoading(false);
                }
                return;
              }

              if (job.status === 'failed') {
                if (pollInterval) clearInterval(pollInterval);
                try { localStorage.removeItem(pendingKey); } catch (e) {}
                setActiveJob(null);
                setErrorMessage(`Synthesis failed: ${job.error || 'Generation error'}`);
                setHistory((prev) => {
                  const filtered = prev.filter((i) => i.id !== pending.jobId);
                  saveUserHistory(user, filtered);
                  return filtered;
                });

                // Continue to next queued item if available
                const currentQueue = queueRef.current;
                if (currentQueue && currentQueue.length > 0) {
                  const nextJob = currentQueue[0];
                  const remainingQueue = currentQueue.slice(1);
                  setQueue(remainingQueue);
                  saveUserQueue(user, remainingQueue);
                  setTimeout(() => {
                    executeSynthesis(nextJob);
                  }, 300);
                } else {
                  setLoading(false);
                }
                return;
              }
            } else if (res.data && res.data.status === 'not_found') {
              if (Date.now() - (pending.startedAt || 0) > 150000) {
                if (pollInterval) clearInterval(pollInterval);
                try { localStorage.removeItem(pendingKey); } catch (e) {}
                setActiveJob(null);
                setLoading(false);
                setHistory((prev) => prev.filter((i) => i.id !== pending.jobId));
              }
            }
          } catch (pollErr) {
            console.warn('[Studio] Polling error:', pollErr.message);
          }
        };

        await pollStatus();
        pollInterval = setInterval(pollStatus, 1500);
      } catch (err) {
        console.warn('[Studio] Error checking pending job:', err);
      }
    };

    checkAndResumePendingJob();

    return () => {
      isCancelled = true;
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [user?.id, user?.email]);


  // Voice Preview States (Main Bar)
  const [previewingVoice, setPreviewingVoice] = useState(false);
  const previewAudioRef = useRef(null);

  // Acoustic Modulation States (Original Defaults)
  const [speed, setSpeed] = useState(-8);
  const [pitch, setPitch] = useState(-4);
  const [pause, setPause] = useState(0.22);
  const [showAcousticControls, setShowAcousticControls] = useState(true);

  // Dynamic Subscription Plans & Real-Time Sync
  const [plans, setPlans] = useState(() => {
    if (dynamicPlans && Array.isArray(dynamicPlans) && dynamicPlans.length > 0) {
      return dynamicPlans;
    }
    try {
      const cached = localStorage.getItem('sk_dynamic_plans_cache');
      return cached ? JSON.parse(cached) : [];
    } catch (e) {
      return [];
    }
  });

  const fetchDynamicPlans = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/plans`);
      if (res.data && res.data.success && Array.isArray(res.data.plans) && res.data.plans.length > 0) {
        setPlans(res.data.plans);
        try {
          localStorage.setItem('sk_dynamic_plans_cache', JSON.stringify(res.data.plans));
        } catch (e) {}
      }
    } catch (err) {
      console.warn('Unable to load dynamic plans in Studio:', err.message);
    }
  };

  useEffect(() => {
    if (dynamicPlans && Array.isArray(dynamicPlans) && dynamicPlans.length > 0) {
      setPlans(dynamicPlans);
    }
  }, [dynamicPlans]);

  useEffect(() => {
    fetchDynamicPlans();

    // Listen for real-time updates from Admin Dashboard or across tabs
    const handlePlansUpdate = (e) => {
      if (e?.detail && Array.isArray(e.detail)) {
        setPlans(e.detail);
      } else {
        fetchDynamicPlans();
      }
    };

    const handleStorageChange = (e) => {
      if (e.key === 'sk_dynamic_plans_cache' && e.newValue) {
        try {
          setPlans(JSON.parse(e.newValue));
        } catch (err) {}
      }
    };

    window.addEventListener('sk-plans-updated', handlePlansUpdate);
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('focus', fetchDynamicPlans);

    return () => {
      window.removeEventListener('sk-plans-updated', handlePlansUpdate);
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('focus', fetchDynamicPlans);
    };
  }, []);

  const currentPlan = user?.plan || 'Free';

  // Find matching plan configuration dynamically
  const matchedPlan = useMemo(() => {
    if (!plans || plans.length === 0) return null;
    const clean = currentPlan.trim().toLowerCase();
    return plans.find(
      (p) =>
        (p.id && p.id.trim().toLowerCase() === clean) ||
        (p.name && p.name.trim().toLowerCase() === clean)
    );
  }, [plans, currentPlan]);

  // Dynamically compute character limit per generation
  const maxCharsAllowed = useMemo(() => {
    if (matchedPlan && matchedPlan.maxCharsPerGen) {
      return parseInt(matchedPlan.maxCharsPerGen, 10);
    }
    // Check if free plan exists in dynamic plans
    if (currentPlan.toLowerCase() === 'free') {
      const freeP = plans.find(p => p.id?.toLowerCase() === 'free' || p.name?.toLowerCase() === 'free');
      if (freeP && freeP.maxCharsPerGen) return parseInt(freeP.maxCharsPerGen, 10);
      return 2500;
    }
    const fallbackLimits = {
      free: 2500,
      lite: 5000,
      pro: 6000,
      studio: 15000
    };
    return fallbackLimits[currentPlan.toLowerCase()] || 2500;
  }, [matchedPlan, plans, currentPlan]);

  // Theme tokens - Clean Light Theme
  const theme = customTheme || {
    cardBg: 'bg-white border-zinc-200/90 shadow-sm',
    panelBg: 'bg-zinc-50 border-zinc-200',
    inputBg: 'bg-white border-zinc-300 text-zinc-900 placeholder-zinc-400 focus:border-zinc-900 focus:ring-zinc-900',
    sidebarBg: 'bg-white border-zinc-200/90 shadow-sm',
    textMuted: 'text-zinc-500',
    btnPrimary: 'bg-zinc-900 hover:bg-zinc-800 text-white shadow-sm active:scale-[0.99] font-bold',
    btnSecondary: 'bg-white hover:bg-zinc-50 text-zinc-800 border border-zinc-300 shadow-sm active:scale-[0.99]'
  };

  // Fetch available voices & metadata registry from server
  const fetchVoices = async (preferredSelection = null) => {
    try {
      const res = await axios.get(`${API_BASE}/api/voices`);
      const voiceList = res.data.voices || [];
      const registryList = res.data.registry || [];
      setAvailableVoices(voiceList);
      setVoiceRegistry(registryList);

      if (preferredSelection && voiceList.includes(preferredSelection)) {
        setReferenceVoice(preferredSelection);
      } else if (voiceList.length > 0 && !voiceList.includes(referenceVoice)) {
        const adamDefault = voiceList.find((v) => v.toLowerCase().includes('adam (deep narration'));
        setReferenceVoice(adamDefault || voiceList[0]);
      }
    } catch (err) {
      console.warn('Unable to load voices from server:', err.message);
    }
  };

  useEffect(() => {
    fetchVoices();
  }, []);

  // Synchronize playback when history item is selected and audioUrl mounts
  useEffect(() => {
    if (audioUrl && playingHistoryId && audioPlayerRef.current) {
      if (audioPlayerRef.current.paused) {
        audioPlayerRef.current.load();
        audioPlayerRef.current.play().catch((err) => {
          console.warn('Playback prevented:', err);
          setPlayingHistoryId(null);
        });
      }
    }
  }, [audioUrl, playingHistoryId]);

  // Handle Custom Voice Upload
  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!uploadFile) {
      setUploadFeedback({ type: 'error', text: 'Please select a .wav audio file.' });
      return;
    }

    if (!uploadFile.name.toLowerCase().endsWith('.wav')) {
      setUploadFeedback({ type: 'error', text: 'Only .wav audio format is supported.' });
      return;
    }

    setUploading(true);
    setUploadFeedback(null);

    const formData = new FormData();
    formData.append('voiceSample', uploadFile);

    try {
      const res = await axios.post(`${API_BASE}/api/upload-voice`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res.data && res.data.success) {
        setUploadFeedback({
          type: 'success',
          text: `Voice "${res.data.filename}" successfully uploaded!`
        });
        setUploadFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        await fetchVoices(res.data.filename);
        setTimeout(() => setShowUploadModal(false), 1400);
      }
    } catch (err) {
      const msg = err.response?.data?.error || err.message;
      setUploadFeedback({ type: 'error', text: `Upload failed: ${msg}` });
    } finally {
      setUploading(false);
    }
  };

  // Remove an item from the queue
  const handleRemoveFromQueue = (indexToRemove) => {
    setQueue((prev) => {
      const updated = prev.filter((_, idx) => idx !== indexToRemove);
      saveUserQueue(user, updated);
      return updated;
    });
  };

  // Clear all pending items from queue
  const handleClearQueue = () => {
    setQueue([]);
    saveUserQueue(user, []);
  };

  // Core Sequential Synthesis Executor
  const executeSynthesis = async (jobItem) => {
    if (!jobItem || !jobItem.text) return;
    if (isSynthesizingRef.current) return;

    isSynthesizingRef.current = true;
    setLoading(true);
    setErrorMessage(null);

    const devId = getDeviceId();
    const tempJobId = jobItem.jobId || `conv_${Date.now()}`;
    const pendingKey = getPendingJobKey(user);

    setActiveJob({
      id: tempJobId,
      text: jobItem.text,
      voiceName: jobItem.voiceName || jobItem.referenceVoice?.replace('.wav', '') || 'Voice Model',
      referenceVoice: jobItem.referenceVoice,
      startedAt: Date.now()
    });

    const pendingJobData = {
      jobId: tempJobId,
      userId: user?.id || null,
      userEmail: user?.email || null,
      deviceId: devId,
      text: jobItem.text,
      referenceVoice: jobItem.referenceVoice,
      voiceName: jobItem.voiceName,
      speed: jobItem.speed,
      pitch: jobItem.pitch,
      pause: jobItem.pause,
      startedAt: Date.now()
    };

    try {
      localStorage.setItem(pendingKey, JSON.stringify(pendingJobData));
    } catch (e) {}

    // Optimistically insert a generating card
    const pendingRecord = {
      id: tempJobId,
      userId: user?.id || null,
      userEmail: user?.email || null,
      deviceId: devId,
      timestamp: new Date().toISOString(),
      text: jobItem.text.length > 120 ? jobItem.text.substring(0, 120) + '...' : jobItem.text,
      referenceVoice: jobItem.referenceVoice,
      status: 'generating'
    };

    setHistory((prev) => {
      const updated = [pendingRecord, ...prev.filter((item) => item.id !== tempJobId)];
      saveUserHistory(user, updated);
      return updated;
    });

    try {
      const token = localStorage.getItem('sk_voiceclone_auth_token');
      const response = await axios.post(`${API_BASE}/api/clone-voice`, {
        jobId: tempJobId,
        text: jobItem.text,
        referenceVoice: jobItem.referenceVoice,
        deviceId: devId,
        speed: jobItem.speed,
        pitch: jobItem.pitch,
        pause: jobItem.pause
      }, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      try {
        localStorage.removeItem(pendingKey);
      } catch (e) {}

      if (response.data && response.data.audioUrl) {
        const fullAudioUrl = `${API_BASE}${response.data.audioUrl}`;
        setAudioUrl(fullAudioUrl);

        if (onDeductCredits) {
          if (response.data.remainingCredits !== undefined && response.data.remainingCredits !== null) {
            onDeductCredits(response.data.remainingCredits, true);
          } else {
            onDeductCredits(jobItem.text.length, false);
          }
        }
        if (onRefreshUser) onRefreshUser();

        const newRecord = {
          id: response.data.historyRecord?.id || response.data.id || tempJobId,
          userId: user?.id || null,
          userEmail: user?.email || null,
          deviceId: devId,
          timestamp: new Date().toISOString(),
          text: jobItem.text.length > 120 ? jobItem.text.substring(0, 120) + '...' : jobItem.text,
          referenceVoice: jobItem.referenceVoice,
          audioUrl: response.data.audioUrl,
          speed: jobItem.speed,
          pitch: jobItem.pitch,
          pause: jobItem.pause,
          status: 'ready'
        };

        setHistory((prev) => {
          const updated = [newRecord, ...prev.filter((item) => item.id !== tempJobId && item.id !== newRecord.id)];
          saveUserHistory(user, updated);
          return updated;
        });

        setTimeout(() => {
          if (audioPlayerRef.current) {
            audioPlayerRef.current.play().catch(() => {});
          }
        }, 100);
      }
    } catch (err) {
      try {
        localStorage.removeItem(pendingKey);
      } catch (e) {}

      setHistory((prev) => {
        const filtered = prev.filter((item) => item.id !== tempJobId);
        saveUserHistory(user, filtered);
        return filtered;
      });
      const msg = err.response?.data?.error || err.message || 'Error occurred during voice cloning.';
      setErrorMessage(`Synthesis failed: ${msg}`);
    } finally {
      isSynthesizingRef.current = false;
      setActiveJob(null);

      // Check if there are queued audios waiting to synthesize
      const currentQueue = queueRef.current;
      if (currentQueue && currentQueue.length > 0) {
        const nextJob = currentQueue[0];
        const remainingQueue = currentQueue.slice(1);
        setQueue(remainingQueue);
        saveUserQueue(user, remainingQueue);

        setTimeout(() => {
          executeSynthesis(nextJob);
        }, 300);
      } else {
        setLoading(false);
      }
    }
  };
  executeSynthesisRef.current = executeSynthesis;

  // Form submission handler for Voice Cloning & Queue Dispatch
  const handleGenerateSubmit = async (e) => {
    if (e) e.preventDefault();

    if (!text.trim()) {
      setErrorMessage('Please enter a script or text prompt before synthesizing.');
      return;
    }

    if (text.length > maxCharsAllowed) {
      setErrorMessage(`Your script (${text.length.toLocaleString()} characters) exceeds the ${currentPlan} plan limit of ${maxCharsAllowed.toLocaleString()} characters. Please upgrade your package to generate longer audio.`);
      return;
    }

    if (user && user.credits < text.length) {
      setErrorMessage(`Insufficient credits! You need ${text.length.toLocaleString()} credits, but only have ${user.credits.toLocaleString()} remaining. Please upgrade your package.`);
      return;
    }

    if (!referenceVoice) {
      setErrorMessage('Please select or upload a reference voice sample.');
      return;
    }

    setErrorMessage(null);

    const voiceDisplayName = currentVoiceObj?.name || referenceVoice.replace('.wav', '');
    const newJobItem = {
      jobId: `conv_${Date.now()}`,
      text: text.trim(),
      referenceVoice: referenceVoice,
      voiceName: voiceDisplayName,
      speed: speed,
      pitch: pitch,
      pause: pause,
      chars: text.trim().length,
      queuedAt: Date.now()
    };

    // If an audio is currently synthesizing, add this next text to the Queue!
    if (loading || isSynthesizingRef.current) {
      const updatedQueue = [...queueRef.current, newJobItem];
      setQueue(updatedQueue);
      saveUserQueue(user, updatedQueue);
      setText(''); // Clear textarea so user can immediately type their next audio!
      return;
    }

    // Nothing is currently synthesizing: execute immediately and clear textarea for next audio
    setText('');
    executeSynthesis(newJobItem);
  };


  // Preview Voice Sample
  const handlePreviewVoice = () => {
    if (!referenceVoice) return;
    if (previewingVoice) {
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
      }
      setPreviewingVoice(false);
      return;
    }

    // Pause any other playing audio
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      setPlayingHistoryId(null);
    }

    setPreviewingVoice(true);
    if (previewAudioRef.current) {
      const cleanVoice = referenceVoice.trim();
      previewAudioRef.current.src = `${API_BASE}/voices/${encodeURIComponent(cleanVoice)}`;
      previewAudioRef.current.load();
      previewAudioRef.current.play().catch((err) => {
        console.warn('Voice preview playback failed:', err);
        setPreviewingVoice(false);
      });
    }
  };

  // Play audio from history card
  const handleQuickPlay = (historyItem, e) => {
    if (e) e.stopPropagation();

    // Pause sample voice preview if active
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      setPreviewingVoice(false);
    }

    if (playingHistoryId === historyItem.id) {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
      }
      setPlayingHistoryId(null);
      return;
    }

    const rawPath = historyItem.audioUrl || '';
    const fullUrl = rawPath.startsWith('http://') || rawPath.startsWith('https://')
      ? rawPath
      : `${API_BASE}${rawPath.startsWith('/') ? rawPath : `/${rawPath}`}`;

    setAudioUrl(fullUrl);
    setPlayingHistoryId(historyItem.id);

    if (audioPlayerRef.current) {
      audioPlayerRef.current.src = fullUrl;
      audioPlayerRef.current.load();
      audioPlayerRef.current.play().catch((err) => {
        console.warn('Playback prevented:', err);
        setPlayingHistoryId(null);
      });
    }
  };

  // Download audio handler
  const handleDownloadAudio = (audioPath, voiceName, e, itemId = null) => {
    if (e) e.stopPropagation();
    if (itemId) setDownloadingId(itemId);

    try {
      const rawPath = audioPath || '';
      const fullUrl = rawPath.startsWith('http://') || rawPath.startsWith('https://')
        ? rawPath
        : `${API_BASE}${rawPath.startsWith('/') ? rawPath : `/${rawPath}`}`;
      const safeVoice = (voiceName || 'voice').replace(/[^a-zA-Z0-9_-]/g, '_');
      const filename = `SK_VoiceClone_${safeVoice}_${Date.now()}.mp3`;

      const link = document.createElement('a');
      link.href = fullUrl;
      link.download = filename;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.warn('Download error:', err);
    } finally {
      if (itemId) setTimeout(() => setDownloadingId(null), 800);
    }
  };

  // Clear local storage history (User-scoped)
  const handleCleanupStorage = async () => {
    if (window.confirm('Clear your generation history in this browser?')) {
      const key = getUserStorageKey(user);
      try {
        localStorage.removeItem(key);
        localStorage.removeItem('sk_voiceclone_studio_history');
      } catch (e) {}
      setHistory([]);
      setAudioUrl(null);
      setPlayingHistoryId(null);
    }
  };

  // Delete individual history item from local storage
  const handleDeleteHistoryItem = (itemId, e) => {
    if (e) e.stopPropagation();
    setHistory((prev) => {
      const updated = prev.filter((item) => item.id !== itemId);
      saveUserHistory(user, updated);
      return updated;
    });
    if (playingHistoryId === itemId) {
      setPlayingHistoryId(null);
    }
  };

  // Filter History Search
  const filteredHistory = useMemo(() => {
    if (!searchHistory.trim()) return history;
    const q = searchHistory.toLowerCase();
    return history.filter(
      (item) => (item.text && item.text.toLowerCase().includes(q)) || (item.referenceVoice && item.referenceVoice.toLowerCase().includes(q))
    );
  }, [history, searchHistory]);

  // Current voice object metadata
  const currentVoiceObj = useMemo(() => {
    return voiceRegistry.find((v) => v.filename === referenceVoice) || null;
  }, [voiceRegistry, referenceVoice]);

  // Grouped dropdown voices
  const groupedVoices = useMemo(() => {
    if (voiceRegistry.length > 0) {
      const groups = {};
      voiceRegistry.forEach((v) => {
        const cat = v.category || 'Other Voices';
        if (!groups[cat]) groups[cat] = [];
        groups[cat].push(v);
      });
      return groups;
    }
    const adamVoices = availableVoices.filter((v) => v.toLowerCase().includes('adam'));
    const otherVoices = availableVoices.filter((v) => !v.toLowerCase().includes('adam'));
    return {
      'ElevenLabs Flagship': adamVoices.map((filename) => ({ filename, name: filename })),
      'Studio Neural & Multilingual': otherVoices.map((filename) => ({ filename, name: filename }))
    };
  }, [voiceRegistry, availableVoices]);

  const charCount = text.length;
  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  const estimatedSeconds = Math.ceil(wordCount / 2.5);

  return (
    <div className="flex-1 w-full relative z-10 py-6 px-4 sm:px-6 lg:px-8 text-zinc-900">
      {/* Hidden audio preview ref */}
      <audio
        ref={previewAudioRef}
        crossOrigin="anonymous"
        preload="auto"
        onEnded={() => setPreviewingVoice(false)}
        onPause={() => setPreviewingVoice(false)}
        onError={() => setPreviewingVoice(false)}
      />

      <div className="max-w-7xl mx-auto space-y-6">
        {/* Commercial Account & Credit Status Strip (Clean Light Theme) */}
        <div className="p-4 sm:p-5 rounded-2xl border border-zinc-200/90 bg-white/95 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-600 text-white font-extrabold flex items-center justify-center text-sm shadow-md shadow-indigo-500/25">
              ⚡
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-extrabold uppercase tracking-wider text-zinc-900">
                  {currentPlan} Studio Plan
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold">
                  Active
                </span>
              </div>
              <p className="text-xs text-zinc-500 font-medium mt-0.5">
                Available Credits: <strong className="text-indigo-950 font-mono font-extrabold">{user?.credits?.toLocaleString() || '2,000'}</strong> • Max Script: <span className="text-zinc-700 font-semibold">{maxCharsAllowed.toLocaleString()} chars</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
            <button
              onClick={() => onNavigate('pricing')}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white shadow-sm shadow-indigo-500/20 transition-all active:scale-95 whitespace-nowrap"
            >
              Upgrade Packages →
            </button>
          </div>
        </div>

        {/* Studio 2-Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT COLUMN (8 Cols) */}
          <main className="lg:col-span-8 space-y-6">
            {/* Reference Voice Selection Card */}
            <div className={`p-5 rounded-2xl border backdrop-blur-md ${theme.cardBg}`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <div>
                  <label htmlFor="voice-selector" className="text-sm font-semibold tracking-wide flex items-center gap-2 text-zinc-900">
                    <svg width="16" height="16" className="w-4 h-4 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 100-6 3 3 0 000 6z" />
                    </svg>
                    <span>Target Reference Voice Model</span>
                  </label>
                  <p className={`text-xs ${theme.textMuted} mt-0.5`}>
                    Select from 120 unique human models across English, Urdu, Hindi, Arabic, Chinese & more.
                  </p>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowUploadModal(!showUploadModal)}
                    className={`inline-flex items-center justify-center gap-1.5 px-3.5 h-8 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 transition-all ${theme.btnPrimary}`}
                  >
                    <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                    </svg>
                    <span>Upload .wav</span>
                  </button>
                </div>
              </div>

              {/* Upload Drawer */}
              {showUploadModal && (
                <div className={`mb-4 p-4 rounded-xl border animate-fadeIn ${theme.panelBg}`}>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-zinc-900">
                      Upload Custom Voice Sample (.wav)
                    </span>
                    <button
                      onClick={() => setShowUploadModal(false)}
                      className={`text-xs ${theme.textMuted} hover:text-zinc-900`}
                    >
                      Close
                    </button>
                  </div>
                  <form onSubmit={handleUploadSubmit} className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept=".wav,audio/wav,audio/x-wav"
                      onChange={(e) => {
                        setUploadFile(e.target.files[0] || null);
                        setUploadFeedback(null);
                      }}
                      disabled={uploading}
                      className="text-xs file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold cursor-pointer flex-1 file:bg-zinc-100 file:text-zinc-800 text-zinc-600"
                    />
                    <button
                      type="submit"
                      disabled={uploading || !uploadFile}
                      className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all shrink-0 flex items-center justify-center gap-2 disabled:opacity-50 ${theme.btnPrimary}`}
                    >
                      {uploading ? 'Uploading...' : 'Save to Voices'}
                    </button>
                  </form>

                  {uploadFeedback && (
                    <div className={`mt-2.5 text-xs p-2.5 rounded-lg border ${
                      uploadFeedback.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-700'
                    }`}>
                      {uploadFeedback.text}
                    </div>
                  )}
                </div>
              )}

              {/* Voice Dropdown & Preview Bar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 mb-3">
                <div className="relative flex-1">
                  <select
                    id="voice-selector"
                    value={referenceVoice}
                    onChange={(e) => {
                      setReferenceVoice(e.target.value);
                      if (previewAudioRef.current) {
                        previewAudioRef.current.pause();
                        setPreviewingVoice(false);
                      }
                    }}
                    disabled={loading || availableVoices.length === 0}
                    className={`w-full appearance-none rounded-xl border px-4 py-3 text-sm focus:outline-none transition-all cursor-pointer font-medium ${theme.inputBg}`}
                  >
                    {Object.keys(groupedVoices).length === 0 ? (
                      <option value="">No voices available. Upload a .wav file above.</option>
                    ) : (
                      Object.entries(groupedVoices).map(([groupName, voices]) => (
                        <optgroup key={groupName} label={`❖ ${groupName} (${voices.length} Voices)`}>
                          {voices.map((v) => (
                            <option key={v.filename} value={v.filename}>
                              {v.name || v.filename}
                            </option>
                          ))}
                        </optgroup>
                      ))
                    )}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-zinc-400">
                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handlePreviewVoice}
                  disabled={loading || !referenceVoice}
                  className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold text-xs transition-all shrink-0 active:scale-95 disabled:opacity-50 shadow-sm ${theme.btnSecondary}`}
                >
                  {previewingVoice ? (
                    <span>Playing Sample...</span>
                  ) : (
                    <>
                      <svg width="14" height="14" className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                      <span>Listen Sample</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Acoustic Sliders Panel */}
            <div className={`p-5 rounded-2xl border backdrop-blur-md space-y-4 ${theme.cardBg}`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-inherit">
                <div>
                  <h3 className="text-sm font-bold tracking-wide flex items-center gap-2 text-zinc-900">
                    <span>Human Tone, Pitch & Delivery Studio</span>
                  </h3>
                  <p className={`text-xs ${theme.textMuted}`}>
                    Modulate vocal baritone depth, cadence, and human breath pauses.
                  </p>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => {
                      setPitch(-4);
                      setSpeed(-8);
                      setPause(0.22);
                    }}
                    className="text-xs font-medium px-2.5 py-1 rounded-lg border transition-all text-zinc-600 border-zinc-200 hover:bg-zinc-100 hover:text-zinc-900 cursor-pointer"
                  >
                    Reset Defaults
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAcousticControls(!showAcousticControls)}
                    className="text-xs font-semibold px-2.5 py-1 rounded-lg transition-all border text-zinc-800 bg-zinc-100 border-zinc-300 hover:bg-zinc-200 cursor-pointer"
                  >
                    {showAcousticControls ? 'Hide Sliders' : 'Fine-Tune Sliders'}
                  </button>
                </div>
              </div>

              {showAcousticControls && (
                <div className={`p-4 rounded-xl border space-y-4 animate-fadeIn ${theme.panelBg}`}>
                  {/* Pitch Slider */}
                  <div>
                    <div className="flex justify-between items-center text-xs mb-1.5">
                      <span className="font-semibold flex items-center gap-1.5 text-zinc-800">
                        Vocal Pitch Offset
                        <span className={`text-[11px] font-normal ${theme.textMuted}`}>(Baritone Depth vs High Tone)</span>
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs text-zinc-900">
                          {pitch > 0 ? `+${pitch}Hz` : `${pitch}Hz`}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setPitch(-4)}
                            className={`text-[10px] px-2 py-0.5 rounded font-semibold transition-all border cursor-pointer ${
                              pitch === -4 ? 'bg-zinc-900 text-white border-zinc-900' : 'bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-100'
                            }`}
                          >
                            Deep Baritone (-4Hz)
                          </button>
                          <button
                            type="button"
                            onClick={() => setPitch(0)}
                            className={`text-[10px] px-2 py-0.5 rounded font-semibold transition-all border cursor-pointer ${
                              pitch === 0 ? 'bg-zinc-900 text-white border-zinc-900' : 'bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-100'
                            }`}
                          >
                            Natural (0)
                          </button>
                          <button
                            type="button"
                            onClick={() => setPitch(3)}
                            className={`text-[10px] px-2 py-0.5 rounded font-semibold transition-all border cursor-pointer ${
                              pitch === 3 ? 'bg-zinc-900 text-white border-zinc-900' : 'bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-100'
                            }`}
                          >
                            Crisp High (+3Hz)
                          </button>
                        </div>
                      </div>
                    </div>
                    <input
                      type="range"
                      min="-15"
                      max="15"
                      step="1"
                      value={pitch}
                      onChange={(e) => setPitch(parseInt(e.target.value))}
                      className="w-full cursor-pointer h-1.5 rounded-lg accent-zinc-900 bg-zinc-200"
                    />
                    <div className={`flex justify-between text-[10px] ${theme.textMuted} mt-1`}>
                      <span>Deep Resonant Baritone (-15Hz)</span>
                      <span>Natural Baseline (0Hz)</span>
                      <span>Higher Pitch (+15Hz)</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-inherit">
                    {/* Speaking Pace */}
                    <div>
                      <div className="flex justify-between items-center text-xs mb-1">
                        <span className="font-semibold text-zinc-800">Speaking Pace</span>
                        <span className="font-mono text-xs font-bold text-zinc-900">
                          {speed > 0 ? `+${speed}%` : `${speed}%`}
                        </span>
                      </div>
                      <input
                        type="range"
                        min="-30"
                        max="30"
                        step="2"
                        value={speed}
                        onChange={(e) => setSpeed(parseInt(e.target.value))}
                        className="w-full cursor-pointer h-1.5 rounded-lg accent-zinc-900 bg-zinc-200"
                      />
                      <div className={`flex justify-between text-[10px] ${theme.textMuted} mt-0.5`}>
                        <span>Slow (-30%)</span>
                        <span className="font-semibold text-zinc-700">Default (-8%)</span>
                        <span>Fast (+30%)</span>
                      </div>
                    </div>

                    {/* Sentence Pause */}
                    <div>
                      <div className="flex justify-between items-center text-xs mb-1">
                        <span className="font-semibold text-zinc-800">Breath & Pause</span>
                        <span className="font-mono text-xs font-bold text-zinc-900">
                          {pause.toFixed(2)}s
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0.08"
                        max="0.60"
                        step="0.02"
                        value={pause}
                        onChange={(e) => setPause(parseFloat(e.target.value))}
                        className="w-full cursor-pointer h-1.5 rounded-lg accent-zinc-900 bg-zinc-200"
                      />
                      <div className={`flex justify-between text-[10px] ${theme.textMuted} mt-0.5`}>
                        <span>Snappy (0.08s)</span>
                        <span className="font-semibold text-zinc-700">Natural (0.22s)</span>
                        <span>Dramatic (0.60s)</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Script Input & Generation Form */}
            <div className={`p-5 sm:p-6 rounded-2xl border backdrop-blur-md space-y-4 ${theme.cardBg}`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <label htmlFor="script-textarea" className="text-sm font-semibold tracking-wide text-zinc-900">
                    Script / Story Text
                  </label>
                  <p className={`text-xs ${theme.textMuted}`}>
                    Smart punctuation breathing and pitch normalization are automatically applied.
                  </p>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className={`text-[11px] ${theme.textMuted} mr-1`}>Samples:</span>
                  <button
                    type="button"
                    onClick={() => setText("Deep within the silent ocean trenches lies an untouched realm of darkness and wonder, older than the continents themselves.")}
                    className="text-[11px] px-2.5 py-1 rounded-md border font-medium border-zinc-200 bg-zinc-100 text-zinc-700 hover:bg-zinc-200 hover:text-zinc-900 cursor-pointer"
                  >
                    English
                  </button>
                  <button
                    type="button"
                    onClick={() => setText("السلام علیکم۔ زندگی کا ہر نیا دن امید، حوصلے اور خوابوں کو تعبیر دینے کا ایک شاندار موقع ہے۔")}
                    className="text-[11px] px-2.5 py-1 rounded-md border font-medium border-zinc-200 bg-zinc-100 text-zinc-700 hover:bg-zinc-200 hover:text-zinc-900 cursor-pointer"
                  >
                    Urdu اردو
                  </button>
                  <button
                    type="button"
                    onClick={() => setText("नमस्ते। सफलता का रहस्य निरंतर प्रयास, अटूट विश्वास और सकारात्मक सोच में छिपा है।")}
                    className="text-[11px] px-2.5 py-1 rounded-md border font-medium border-zinc-200 bg-zinc-100 text-zinc-700 hover:bg-zinc-200 hover:text-zinc-900 cursor-pointer"
                  >
                    Hindi हिन्दी
                  </button>
                  <button
                    type="button"
                    onClick={() => setText("مرحباً بكم. المستقبل يُبنى بالإرادة الصادقة والعمل الدؤوب، متطلعين دائماً نحو القمة.")}
                    className="text-[11px] px-2.5 py-1 rounded-md border font-medium border-zinc-200 bg-zinc-100 text-zinc-700 hover:bg-zinc-200 hover:text-zinc-900 cursor-pointer"
                  >
                    Arabic العربية
                  </button>
                </div>
              </div>

              {/* Error Message */}
              {errorMessage && (
                <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-start gap-3">
                  <svg width="20" height="20" className="w-5 h-5 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="break-words flex-1">{errorMessage}</div>
                </div>
              )}

              {/* Character Limit Exceeded Warning */}
              {charCount > maxCharsAllowed && (
                <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center justify-between gap-3">
                  <span>
                    Current script ({charCount.toLocaleString()} chars) exceeds your {currentPlan} plan limit ({maxCharsAllowed.toLocaleString()} chars).
                  </span>
                  <button
                    onClick={() => onNavigate('pricing')}
                    className="underline font-bold text-amber-900 hover:text-black cursor-pointer"
                  >
                    Upgrade Plan
                  </button>
                </div>
              )}

              {/* Textarea: Kept active so user can type the next script while one is synthesizing */}
              <div className="relative">
                <textarea
                  id="script-textarea"
                  rows="6"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder={
                    loading
                      ? "Audio is synthesizing below! Type your NEXT script here to queue it for automatic processing..."
                      : "Type or paste your text script here in any language (English, Urdu, Hindi, Arabic, Chinese, Spanish, French, German, Japanese, Korean, Italian, etc.)..."
                  }
                  className={`w-full rounded-xl border p-4 text-sm focus:outline-none transition-all resize-y leading-relaxed font-normal ${theme.inputBg}`}
                />
                <div className="absolute bottom-3 right-3 text-xs flex items-center gap-2 pointer-events-none select-none text-zinc-500">
                  <span className={`font-semibold ${charCount > maxCharsAllowed ? 'text-rose-600' : 'text-zinc-700'}`}>
                    {charCount.toLocaleString()} / {maxCharsAllowed.toLocaleString()} chars
                  </span>
                  <span className="opacity-40">•</span>
                  <span>~{estimatedSeconds}s audio</span>
                </div>
              </div>

              {/* Submit Synthesize / Add to Queue Button */}
              <div className="pt-2 w-full">
                <button
                  type="button"
                  onClick={handleGenerateSubmit}
                  disabled={!text.trim() || !referenceVoice || charCount > maxCharsAllowed}
                  className={`w-full py-4 px-6 rounded-2xl text-sm font-extrabold tracking-wide transition-all duration-200 flex items-center justify-center gap-3 cursor-pointer disabled:cursor-not-allowed active:scale-[0.99] ${
                    loading
                      ? 'bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 hover:from-amber-700 hover:to-orange-700 text-white shadow-xl shadow-orange-500/20'
                      : 'bg-gradient-to-r from-indigo-600 via-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white shadow-xl shadow-indigo-500/25'
                  } ${
                    !text.trim() || !referenceVoice || charCount > maxCharsAllowed ? 'opacity-60' : 'opacity-100'
                  }`}
                >
                  {loading ? (
                    <>
                      <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-5 h-5 shrink-0">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
                      </svg>
                      <span>
                        + Add Next Script to Queue {queue.length > 0 ? `(${queue.length} waiting)` : ''}
                      </span>
                    </>
                  ) : (
                    <>
                      <svg width="20" height="20" className="w-5 h-5 fill-current shrink-0" viewBox="0 0 24 24">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" />
                      </svg>
                      <span>
                        Synthesize Voice With {currentVoiceObj?.name || referenceVoice.replace('.wav', '')}
                      </span>
                    </>
                  )}
                </button>
              </div>

              {/* Live Synthesis Queue & Processing Monitor */}
              {(loading || queue.length > 0) && (
                <div className="p-4 sm:p-5 rounded-2xl border border-indigo-200/90 bg-gradient-to-br from-indigo-50/90 via-purple-50/40 to-white shadow-sm space-y-3.5 mt-2 animate-fadeIn">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-600"></span>
                      </span>
                      <h4 className="text-xs sm:text-sm font-bold text-zinc-900 tracking-tight flex items-center gap-2">
                        Studio Synthesis Queue
                        <span className="text-[10px] sm:text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 border border-indigo-200">
                          {loading ? '1 Active' : 'Idle'} {queue.length > 0 ? `• ${queue.length} Queued` : ''}
                        </span>
                      </h4>
                    </div>
                    {queue.length > 0 && (
                      <button
                        type="button"
                        onClick={handleClearQueue}
                        className="text-[11px] font-semibold text-rose-600 hover:text-rose-800 hover:underline cursor-pointer"
                      >
                        Clear Queue
                      </button>
                    )}
                  </div>

                  {/* Active Synthesizing Job Banner */}
                  {loading && (
                    <div className="p-3.5 rounded-xl bg-white border border-indigo-200 shadow-xs flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                          <svg width="16" height="16" className="animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                          </svg>
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-zinc-900 truncate">
                              {activeJob?.voiceName || referenceVoice.replace('.wav', '')}
                            </span>
                            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 font-bold uppercase tracking-wider">
                              Synthesizing Now
                            </span>
                          </div>
                          <p className="text-xs text-zinc-500 truncate mt-0.5">
                            "{activeJob?.text ? (activeJob.text.length > 85 ? activeJob.text.substring(0, 85) + '...' : activeJob.text) : 'Rendering audio...'}"
                          </p>
                        </div>
                      </div>
                      <span className="text-[11px] font-medium text-indigo-600 shrink-0 hidden sm:inline-block">
                        Auto-playing when ready
                      </span>
                    </div>
                  )}

                  {/* Queued Next Items */}
                  {queue.length > 0 && (
                    <div className="space-y-2 pt-1">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 px-1">
                        Up Next in Queue ({queue.length})
                      </div>
                      <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                        {queue.map((item, idx) => (
                          <div
                            key={item.id || idx}
                            className="p-2.5 rounded-xl bg-white/95 border border-zinc-200/90 hover:border-indigo-300 transition-all flex items-center justify-between gap-3 text-xs shadow-2xs"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className="w-5 h-5 rounded-md bg-zinc-100 border border-zinc-200 text-zinc-700 font-mono font-bold text-[10px] flex items-center justify-center shrink-0">
                                #{idx + 1}
                              </span>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-zinc-900 truncate">{item.voiceName}</span>
                                  <span className="text-[10px] font-mono text-zinc-500 bg-zinc-100 px-1.5 py-0.5 rounded">
                                    {item.chars?.toLocaleString()} chars
                                  </span>
                                </div>
                                <p className="text-zinc-500 truncate mt-0.5">
                                  "{item.text?.length > 70 ? item.text.substring(0, 70) + '...' : item.text}"
                                </p>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleRemoveFromQueue(idx)}
                              className="p-1 rounded-md text-zinc-400 hover:text-rose-600 hover:bg-rose-50 transition-colors shrink-0 cursor-pointer"
                              title="Remove from queue"
                            >
                              <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>


            {/* Mastered Output Audio Ready Console (DAW Master Rack Aesthetic) */}
            {audioUrl && (
              <div className="p-6 rounded-3xl bg-zinc-950 text-white border border-zinc-800 shadow-2xl space-y-5 animate-fadeIn relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                      <h3 className="text-sm sm:text-base font-extrabold tracking-tight text-white">
                        Mastered Studio Audio Ready
                      </h3>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-bold">
                        320kbps MP3
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400 mt-1">
                      Rendered with <strong className="text-zinc-200">{currentVoiceObj?.name || referenceVoice.replace('.wav', '')}</strong> • Saved to your client history
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDownloadAudio(audioUrl, referenceVoice)}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold transition-all inline-flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white shadow-lg shadow-indigo-500/25 active:scale-95 shrink-0"
                  >
                    <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    <span>Download MP3</span>
                  </button>
                </div>

                {/* Glowing Equalizer Soundwave Visualizer */}
                <div className="p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-1.5 h-10 flex-1 overflow-hidden px-2">
                    {[40, 75, 55, 90, 60, 100, 35, 80, 50, 95, 45, 85, 65, 90, 30, 70, 85, 40, 75, 55, 95, 60, 80, 50].map((h, i) => (
                      <span
                        key={i}
                        className="w-1.5 rounded-full bg-gradient-to-t from-indigo-500 via-purple-400 to-pink-400 animate-pulse"
                        style={{
                          height: `${h}%`,
                          animationDelay: `${i * 60}ms`
                        }}
                      ></span>
                    ))}
                  </div>
                  <span className="text-xs font-mono text-zinc-400 font-semibold px-2">
                    Stereo 48kHz
                  </span>
                </div>

                {/* Native Audio Controls */}
                <audio
                  ref={audioPlayerRef}
                  src={audioUrl}
                  controls
                  crossOrigin="anonymous"
                  preload="auto"
                  className="w-full focus:outline-none rounded-xl"
                  onEnded={() => setPlayingHistoryId(null)}
                  onPause={() => setPlayingHistoryId(null)}
                />
              </div>
            )}
          </main>

          {/* RIGHT COLUMN: Generation Timeline (4 Cols) */}
          <aside className="lg:col-span-4 space-y-6">
            <div className={`p-5 rounded-2xl border backdrop-blur-md space-y-4 ${theme.sidebarBg}`}>
              <div className="flex items-center justify-between pb-2 border-b border-inherit">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold tracking-wide text-zinc-900">Recent Generations</h3>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-700 font-mono">
                    {history.length}
                  </span>
                </div>
                {history.length > 0 && (
                  <button
                    type="button"
                    onClick={handleCleanupStorage}
                    className="text-xs text-zinc-500 hover:text-rose-600 transition-colors cursor-pointer"
                  >
                    Clear All
                  </button>
                )}
              </div>

              {history.length > 3 && (
                <input
                  type="text"
                  value={searchHistory}
                  onChange={(e) => setSearchHistory(e.target.value)}
                  placeholder="Search history..."
                  className={`w-full rounded-lg border px-3 py-1.5 text-xs focus:outline-none transition-all ${theme.inputBg}`}
                />
              )}

              <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
                {loadingHistory ? (
                  <div className="p-4 text-center text-xs text-zinc-500">Loading device history...</div>
                ) : filteredHistory.length === 0 ? (
                  <div className="p-6 text-center text-xs text-zinc-500 border border-dashed rounded-xl border-zinc-300">
                    No past generations yet. Click Synthesize to create your first clip.
                  </div>
                ) : (
                  filteredHistory.map((item) => {
                    const isGenerating = item.status === 'generating';
                    const isPlaying = playingHistoryId === item.id;

                    if (isGenerating) {
                      return (
                        <div
                          key={item.id}
                          className="p-3.5 rounded-xl border bg-zinc-50 border-zinc-200 text-xs space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-zinc-900">
                              {(item.referenceVoice || 'Voice').replace('.wav', '')}
                            </span>
                            <span className="text-[10px] font-bold text-emerald-600 animate-pulse">
                              Synthesizing...
                            </span>
                          </div>
                          <p className="text-zinc-600 line-clamp-2 italic">"{item.text}"</p>
                        </div>
                      );
                    }

                    const itemAgeMs = item.timestamp ? Date.now() - new Date(item.timestamp).getTime() : 0;
                    const isExpired = Boolean(item.isExpired || itemAgeMs > 24 * 3600 * 1000);

                    if (isExpired) {
                      return (
                        <div
                          key={item.id}
                          className="p-3.5 rounded-xl border border-zinc-200 bg-zinc-50/60 text-xs space-y-2 opacity-80"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-bold truncate text-zinc-700">
                              {item.referenceVoice ? item.referenceVoice.replace('.wav', '') : 'Voice'}
                            </span>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-zinc-200 text-zinc-600">
                                📁 Purged (24h)
                              </span>
                              <button
                                type="button"
                                onClick={(e) => handleDeleteHistoryItem(item.id, e)}
                                className="text-zinc-400 hover:text-rose-600 px-1 text-xs cursor-pointer"
                                title="Delete from history"
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                          <p className="text-zinc-500 line-clamp-2 italic leading-relaxed">"{item.text}"</p>
                          <div className="pt-2 border-t border-zinc-200 flex justify-end">
                            <button
                              type="button"
                              onClick={() => {
                                if (item.text) setText(item.text);
                                if (item.referenceVoice) setReferenceVoice(item.referenceVoice);
                                window.scrollTo({ top: 300, behavior: 'smooth' });
                              }}
                              className="text-[11px] font-bold text-zinc-900 hover:underline cursor-pointer"
                            >
                              ↺ Load Script in Editor
                            </button>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={item.id}
                        onClick={() => handleQuickPlay(item)}
                        className={`p-3.5 rounded-xl border cursor-pointer transition-all hover:scale-[1.01] flex flex-col gap-2 ${
                          isPlaying
                            ? 'bg-zinc-100 border-zinc-400 shadow-md text-zinc-900'
                            : 'bg-white hover:bg-zinc-50 border-zinc-200 text-zinc-900 shadow-xs'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold truncate text-zinc-900">
                            {item.referenceVoice ? item.referenceVoice.replace('.wav', '') : 'Voice'}
                          </span>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="text-[10px] text-zinc-500 font-mono">
                              {item.timestamp ? new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => handleDeleteHistoryItem(item.id, e)}
                              className="text-zinc-400 hover:text-rose-600 px-1 text-xs cursor-pointer"
                              title="Delete from history"
                            >
                              ✕
                            </button>
                          </div>
                        </div>

                        <p className="text-xs text-zinc-600 line-clamp-2 italic leading-relaxed">
                          "{item.text}"
                        </p>

                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-200">
                          <button
                            type="button"
                            onClick={(e) => handleQuickPlay(item, e)}
                            className="py-1 px-2 rounded-lg text-xs font-semibold bg-zinc-900 text-white hover:bg-zinc-800 text-center cursor-pointer"
                          >
                            {isPlaying ? 'Pause' : 'Play'}
                          </button>
                          <button
                            type="button"
                            onClick={(e) => handleDownloadAudio(item.audioUrl, item.referenceVoice, e, item.id)}
                            className="py-1 px-2 rounded-lg text-xs font-semibold border border-zinc-300 hover:bg-zinc-100 text-zinc-800 text-center cursor-pointer"
                          >
                            Download
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
