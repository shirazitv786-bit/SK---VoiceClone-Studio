import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

// Backend API URL: relative in production (same origin), localhost:5000 when running standalone Vite dev server
const API_BASE = typeof window !== 'undefined' && window.location.port === '5173' ? 'http://localhost:5000' : '';

// Unique anonymous device token helper (guarantees device-specific isolation and background persistence)
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

export default function App() {
  // Theme state: dark / light
  const [isDarkMode, setIsDarkMode] = useState(true);

  // Server Connectivity State
  const [serverOnline, setServerOnline] = useState(null); // null = checking, true = online, false = offline

  // TTS Generation States
  const [text, setText] = useState('');
  const [referenceVoice, setReferenceVoice] = useState('Adam (Deep Narration - ElevenLabs Style).wav');
  const [loading, setLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const [availableVoices, setAvailableVoices] = useState([]);
  const [errorMessage, setErrorMessage] = useState(null);

  // Custom Voice Upload States
  const [uploadFile, setUploadFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadFeedback, setUploadFeedback] = useState(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const fileInputRef = useRef(null);

  // History States - Isolated per device using browser localStorage
  const LOCAL_STORAGE_KEY = 'sk_voiceclone_studio_history';
  const [history, setHistory] = useState(() => {
    try {
      const saved = localStorage.getItem('sk_voiceclone_studio_history');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [searchHistory, setSearchHistory] = useState('');
  const audioPlayerRef = useRef(null);

  // Voice Preview States
  const [previewingVoice, setPreviewingVoice] = useState(false);
  const previewAudioRef = useRef(null);

  // Emotion & Acoustic Modulation States
  const [emotion, setEmotion] = useState('neutral');
  const [styleDegree, setStyleDegree] = useState(1.0);
  const [speed, setSpeed] = useState(-8);
  const [pitch, setPitch] = useState(-4);
  const [pause, setPause] = useState(0.22);
  const [showAcousticControls, setShowAcousticControls] = useState(true);

  const EMOTION_OPTIONS = [
    { id: 'neutral', label: 'Neutral', icon: '🌟', tagline: 'Natural & Balanced' },
    { id: 'cheerful', label: 'Cheerful', icon: '😊', tagline: 'Smiling & Bright' },
    { id: 'excited', label: 'Excited', icon: '🤩', tagline: 'Rapid & Dynamic' },
    { id: 'sad', label: 'Sad', icon: '😢', tagline: 'Subdued & Slower' },
    { id: 'empathetic', label: 'Empathetic', icon: '💖', tagline: 'Soft, Warm & Caring' },
    { id: 'whispering', label: 'Whispering', icon: '🤫', tagline: 'Breathy & Intimate' },
    { id: 'angry', label: 'Angry', icon: '😠', tagline: 'Intense & Stressed' },
    { id: 'terrified', label: 'Terrified', icon: '😨', tagline: 'Breathless & Trembling' },
    { id: 'newscast', label: 'Newscast', icon: '🎙️', tagline: 'Authoritative Broadcast' }
  ];

  const handlePreviewVoice = () => {
    if (!referenceVoice) return;
    try {
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
      }
      const audio = new Audio(`${API_BASE}/voices/${encodeURIComponent(referenceVoice)}`);
      previewAudioRef.current = audio;
      setPreviewingVoice(true);
      audio.play().catch(e => {
        console.warn('Audio preview playback error:', e);
        setPreviewingVoice(false);
      });
      audio.onended = () => setPreviewingVoice(false);
      audio.onerror = () => setPreviewingVoice(false);
    } catch (err) {
      console.warn('Preview error:', err);
      setPreviewingVoice(false);
    }
  };

  // Check backend health & fetch available voices
  const fetchVoices = async (preferredSelection = null) => {
    try {
      const res = await axios.get(`${API_BASE}/api/voices`);
      const voiceList = res.data.voices || [];
      setAvailableVoices(voiceList);
      setServerOnline(true);

      if (preferredSelection && voiceList.includes(preferredSelection)) {
        setReferenceVoice(preferredSelection);
      } else if (voiceList.length > 0 && !voiceList.includes(referenceVoice)) {
        const adamDefault = voiceList.find((v) => v.toLowerCase().includes('adam (deep narration'));
        setReferenceVoice(adamDefault || voiceList[0]);
      }
    } catch (err) {
      console.warn('Unable to load voices from server:', err.message);
      setServerOnline(false);
    }
  };

  // Fetch generation history for THIS device from server (synced with localStorage)
  const fetchHistory = async () => {
    setLoadingHistory(true);
    const devId = getDeviceId();
    try {
      const res = await axios.get(`${API_BASE}/api/history`, {
        params: { deviceId: devId }
      });
      const serverHistory = res.data.history || [];
      setHistory(serverHistory);
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(serverHistory));
      } catch (e) {}
      setServerOnline(true);
    } catch (err) {
      console.warn('Unable to load history from server, using local cache:', err.message);
      try {
        const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (saved) setHistory(JSON.parse(saved));
      } catch (e) {}
    } finally {
      setTimeout(() => setLoadingHistory(false), 150);
    }
  };

  // Initial data loading on mount
  useEffect(() => {
    fetchVoices();
    fetchHistory();
  }, []);

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

  // Form submission handler for Voice Cloning
  const handleGenerateSubmit = async (e) => {
    e.preventDefault();

    if (!text.trim()) {
      setErrorMessage('Please enter a script or text prompt before synthesizing.');
      return;
    }

    if (!referenceVoice) {
      setErrorMessage('Please select or upload a reference voice sample.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const response = await axios.post(`${API_BASE}/api/clone-voice`, {
        text: text.trim(),
        referenceVoice: referenceVoice,
        emotion: emotion,
        styleDegree: styleDegree,
        speed: speed,
        pitch: pitch,
        pause: pause,
        deviceId: getDeviceId()
      });

      if (response.data && response.data.success) {
        // Resolve full URL
        const rawUrl = response.data.audioUrl;
        const fullAudioUrl = rawUrl.startsWith('http') ? rawUrl : `${API_BASE}${rawUrl}`;
        setAudioUrl(fullAudioUrl);

        // Prepend new record to this device's localStorage
        const newRecord = response.data.historyRecord || {
          id: `conv_${Date.now()}`,
          timestamp: new Date().toISOString(),
          text: text.trim().length > 120 ? text.trim().substring(0, 120) + '...' : text.trim(),
          referenceVoice: referenceVoice,
          emotion: emotion,
          styleDegree: styleDegree,
          audioUrl: rawUrl
        };

        setHistory((prevHistory) => {
          const updated = [newRecord, ...prevHistory.filter((item) => item.id !== newRecord.id)].slice(0, 50);
          try {
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
          } catch (e) {
            console.warn('Could not save to localStorage:', e);
          }
          return updated;
        });

        setTimeout(() => {
          if (audioPlayerRef.current) {
            audioPlayerRef.current.currentTime = 0;
            audioPlayerRef.current.play().catch(() => { });
          }
        }, 150);
      } else {
        setErrorMessage(response.data.error || 'Failed to synthesize voice.');
      }
    } catch (err) {
      console.error('Error generating voice:', err);
      const serverError = err.response?.data?.details || err.response?.data?.error || err.message;
      setErrorMessage(`Generation failed: ${serverError}`);
    } finally {
      setLoading(false);
    }
  };

  // Quick Play handler for past history records
  const handleQuickPlay = (historyAudioUrl) => {
    const fullUrl = historyAudioUrl.startsWith('http') ? historyAudioUrl : `${API_BASE}${historyAudioUrl}`;
    setAudioUrl(fullUrl);
    setTimeout(() => {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.currentTime = 0;
        audioPlayerRef.current.play().catch(() => { });
      }
    }, 100);
  };

  // Storage cleanup handler - Clears history on THIS device only (server + localStorage)
  const handleCleanupStorage = async () => {
    if (!window.confirm('Clear history on this device? (Your other devices will not be affected)')) {
      return;
    }
    const devId = getDeviceId();
    try {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
      setHistory([]);
      setAudioUrl(null);
      await axios.delete(`${API_BASE}/api/history`, {
        params: { deviceId: devId }
      });
    } catch (err) {
      console.error('Failed to clear device history on server:', err);
    }
  };

  // Delete an individual history item from THIS device (server + localStorage)
  const handleDeleteHistoryItem = async (itemId, e) => {
    if (e) e.stopPropagation();
    const devId = getDeviceId();
    setHistory((prevHistory) => {
      const updated = prevHistory.filter((item) => item.id !== itemId);
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
      } catch (err) {
        console.error('Failed to update localStorage:', err);
      }
      return updated;
    });
    try {
      await axios.delete(`${API_BASE}/api/history`, {
        params: { deviceId: devId, itemId: itemId }
      });
    } catch (err) {
      console.warn('Failed to delete history item on server:', err.message);
    }
  };

  // Preset script helpers
  const applyPreset = (presetText) => {
    setText(presetText);
  };

  // Filter history based on search
  const filteredHistory = history.filter(
    (item) =>
      item.text.toLowerCase().includes(searchHistory.toLowerCase()) ||
      item.referenceVoice.toLowerCase().includes(searchHistory.toLowerCase())
  );

  // Dynamic Theme Styling Tokens - Monochromatic Luxury (Black & White)
  const theme = {
    bg: isDarkMode ? 'bg-[#09090b] text-zinc-100' : 'bg-[#fcfcfd] text-zinc-950',
    headerBg: isDarkMode ? 'bg-[#09090b]/95 border-zinc-800' : 'bg-white/95 border-zinc-200',
    cardBg: isDarkMode ? 'bg-[#121215] border-zinc-800/80 shadow-2xl' : 'bg-white border-zinc-200 shadow-sm',
    panelBg: isDarkMode ? 'bg-[#18181b]/80 border-zinc-800' : 'bg-zinc-100/80 border-zinc-200',
    inputBg: isDarkMode
      ? 'bg-[#18181b] border-zinc-800 text-zinc-100 placeholder-zinc-500 focus:border-zinc-500 focus:ring-zinc-600'
      : 'bg-white border-zinc-300 text-zinc-900 placeholder-zinc-400 focus:border-black focus:ring-black',
    sidebarBg: isDarkMode ? 'bg-[#121215] border-zinc-800/80 shadow-2xl' : 'bg-white border-zinc-200 shadow-sm',
    textMuted: isDarkMode ? 'text-zinc-400' : 'text-zinc-500',
    border: isDarkMode ? 'border-zinc-800' : 'border-zinc-200',
    btnPrimary: isDarkMode
      ? 'bg-white hover:bg-zinc-200 text-black shadow-md shadow-white/5 active:scale-[0.99]'
      : 'bg-black hover:bg-zinc-800 text-white shadow-md shadow-black/15 active:scale-[0.99]',
    btnSecondary: isDarkMode
      ? 'bg-zinc-900 hover:bg-zinc-800 text-zinc-100 border border-zinc-700/80'
      : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-900 border border-zinc-300',
  };

  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  const estimatedSeconds = Math.ceil(wordCount / 2.5);

  const adamVoices = availableVoices.filter((v) => v.toLowerCase().includes('adam'));
  const otherVoices = availableVoices.filter((v) => !v.toLowerCase().includes('adam'));

  return (
    <div className={`min-h-screen ${theme.bg} font-sans transition-colors duration-200 flex flex-col`}>

      {/* Top Navigation Bar */}
      <nav className={`sticky top-0 z-30 border-b backdrop-blur-md px-4 sm:px-6 py-3.5 flex items-center justify-between ${theme.headerBg}`}>
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 transition-all ${isDarkMode ? 'bg-white text-black shadow-md shadow-white/5' : 'bg-black text-white shadow-md shadow-black/10'
            }`}>
            <svg width="20" height="20" className="w-5 h-5 fill-none stroke-current" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 100-6 3 3 0 000 6z" />
            </svg>
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold tracking-tight leading-none flex items-center gap-2">
              SK - VoiceClone Studio
            </h1>
            <p className={`text-xs ${theme.textMuted} mt-0.5 hidden sm:block font-medium`}>
              Ai Voice Cloning Studio powered by SHIRAZ KHAN
            </p>
          </div>

        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Server Connection Pill */}
          {serverOnline === false ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20" title="Backend server not responding. Run: node server.js">
              <span className="w-2 h-2 rounded-full bg-rose-400"></span>
              <span>Backend Offline</span>
            </div>
          ) : (
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border ${isDarkMode ? 'bg-zinc-900 text-zinc-300 border-zinc-800' : 'bg-zinc-100 text-zinc-800 border-zinc-200'
              }`}>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Local Engine Ready</span>
            </div>
          )}

          {/* Theme Toggle Button */}
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className={`p-2 rounded-xl border transition-all ${isDarkMode
              ? 'border-zinc-800 bg-zinc-900 text-zinc-200 hover:bg-zinc-800'
              : 'border-zinc-300 bg-white text-zinc-800 hover:bg-zinc-100 shadow-sm'
              }`}
            title="Toggle Dark / Light Theme"
          >
            {isDarkMode ? (
              <svg width="16" height="16" className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ) : (
              <svg width="16" height="16" className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>
        </div>
      </nav>

      {/* Backend Offline Warning Banner (if offline) */}
      {serverOnline === false && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 text-amber-300 text-xs px-4 py-2 text-center flex items-center justify-center gap-2">
          <svg width="16" height="16" className="w-4 h-4 text-amber-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span>
            Node.js backend is offline. Start the backend in your terminal using: <code className="bg-amber-500/20 px-1.5 py-0.5 rounded font-mono">node server.js</code>
          </span>
          <button onClick={fetchVoices} className="underline font-semibold ml-2 hover:text-amber-200">
            Retry Connection
          </button>
        </div>
      )}

      {/* Main Studio Body: 2-Column Responsive Layout */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

        {/* LEFT / MAIN WORKSPACE AREA (8 Columns on desktop) */}
        <main className="lg:col-span-8 space-y-6">

          {/* Voice Selector & Upload Bar */}
          <div className={`p-5 rounded-2xl border backdrop-blur-md ${theme.cardBg}`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <label htmlFor="voice-selector" className="text-sm font-semibold tracking-wide flex items-center gap-2">
                  <svg width="16" height="16" className={`w-4 h-4 ${isDarkMode ? 'text-zinc-300' : 'text-zinc-800'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 100-6 3 3 0 000 6z" />
                  </svg>
                  Target Reference Voice
                </label>
                <p className={`text-xs ${theme.textMuted} mt-0.5`}>
                  XTTS-v2 clones tone, cadence, and vocal timbre from this WAV sample.
                </p>
              </div>

              {/* Upload Voice Toggle Button */}
              <button
                type="button"
                onClick={() => setShowUploadModal(!showUploadModal)}
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 self-start sm:self-center ${theme.btnPrimary}`}
              >
                <svg width="16" height="16" className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                </svg>
                Upload New Sample
              </button>
            </div>

            {/* Inline Upload Drawer */}
            {showUploadModal && (
              <div className={`mb-4 p-4 rounded-xl border animate-fadeIn ${theme.panelBg}`}>
                <div className="flex justify-between items-center mb-2">
                  <span className={`text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-zinc-200' : 'text-zinc-800'}`}>
                    Add Custom Voice Sample (.wav)
                  </span>
                  <button
                    onClick={() => setShowUploadModal(false)}
                    className={`text-xs ${theme.textMuted} hover:text-black dark:hover:text-white transition-colors`}
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
                    className={`text-xs file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold cursor-pointer flex-1 ${isDarkMode
                      ? 'file:bg-zinc-800 file:text-zinc-100 hover:file:bg-zinc-700 text-zinc-300'
                      : 'file:bg-zinc-200 file:text-zinc-900 hover:file:bg-zinc-300 text-zinc-700'
                      }`}
                  />
                  <button
                    type="submit"
                    disabled={uploading || !uploadFile}
                    className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all shrink-0 flex items-center justify-center gap-2 disabled:opacity-50 ${theme.btnPrimary}`}
                  >
                    {uploading ? (
                      <>
                        <svg width="14" height="14" className="animate-spin h-3.5 w-3.5 fill-current" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Uploading...
                      </>
                    ) : (
                      'Save to Voices'
                    )}
                  </button>
                </form>

                {uploadFeedback && (
                  <div
                    className={`mt-2.5 text-xs p-2.5 rounded-lg border ${uploadFeedback.type === 'success'
                      ? isDarkMode
                        ? 'bg-zinc-900 border-zinc-700 text-zinc-200'
                        : 'bg-zinc-100 border-zinc-300 text-zinc-900'
                      : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                      }`}
                  >
                    {uploadFeedback.text}
                  </div>
                )}
              </div>
            )}

            {/* Voice Dropdown & Preview Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
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
                  className={`w-full appearance-none rounded-xl border px-4 py-3 text-sm focus:outline-none transition-all cursor-pointer disabled:opacity-60 font-medium ${theme.inputBg}`}
                >
                  {availableVoices.length === 0 ? (
                    <option value="">No voices available. Upload a .wav file above.</option>
                  ) : (
                    <>
                      {adamVoices.length > 0 && (
                        <optgroup label=" ElevenLabs Adam Suite (All Voices)">
                          {adamVoices.map((voice) => (
                            <option key={voice} value={voice}>
                              {voice}
                            </option>
                          ))}
                        </optgroup>
                      )}
                      {otherVoices.length > 0 && (
                        <optgroup label="Studio Neural & Classic Voices">
                          {otherVoices.map((voice) => (
                            <option key={voice} value={voice}>
                              {voice}
                            </option>
                          ))}
                        </optgroup>
                      )}
                    </>
                  )}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-zinc-400">
                  <svg width="16" height="16" className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>

              {/* Preview Button */}
              <button
                type="button"
                onClick={handlePreviewVoice}
                disabled={loading || !referenceVoice}
                className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold text-xs transition-all shrink-0 active:scale-95 disabled:opacity-50 ${theme.btnSecondary}`}
                title="Listen to a sample of this voice"
              >
                {previewingVoice ? (
                  <>
                    <svg width="14" height="14" className="animate-spin h-3.5 w-3.5 fill-current" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Playing Sample...</span>
                  </>
                ) : (
                  <>
                    <svg width="14" height="14" className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                    <span>Preview Voice</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Human Tone, Pitch & Delivery Studio Panel */}
          <div className={`p-5 rounded-2xl border backdrop-blur-md space-y-4 ${theme.cardBg}`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-inherit">
              <div className="flex items-center gap-2.5">

                <div>
                  <h3 className="text-sm font-bold tracking-wide flex items-center gap-2">
                    Human Tone, Pitch & Delivery Studio
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${isDarkMode
                      ? 'bg-zinc-800 text-zinc-300 border-zinc-700'
                      : 'bg-zinc-200 text-zinc-800 border-zinc-300'
                      }`}>
                      Ultra-Human Pacing
                    </span>
                  </h3>
                  <p className={`text-xs ${theme.textMuted}`}>
                    Modulate vocal baritone depth, cadence, and human breath pauses.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => {
                    setPitch(-4);
                    setSpeed(-8);
                    setPause(0.22);
                    setStyleDegree(1.0);
                    setEmotion('neutral');
                  }}
                  className={`text-xs font-medium px-2.5 py-1 rounded-lg border transition-all ${isDarkMode
                    ? 'text-zinc-400 hover:text-zinc-100 border-zinc-800 hover:bg-zinc-800'
                    : 'text-zinc-600 hover:text-zinc-900 border-zinc-300 hover:bg-zinc-100'
                    }`}
                  title="Reset Pitch to -4Hz, Pace to -8%, Pause to 0.22s, and Style to 1.0x"
                >
                  Reset Defaults
                </button>
                <button
                  type="button"
                  onClick={() => setShowAcousticControls(!showAcousticControls)}
                  className={`text-xs font-semibold px-2.5 py-1 rounded-lg transition-all border ${isDarkMode
                    ? 'text-zinc-200 bg-zinc-800/80 hover:bg-zinc-700 border-zinc-700'
                    : 'text-zinc-800 bg-zinc-100 hover:bg-zinc-200 border-zinc-300'
                    }`}
                >
                  {showAcousticControls ? 'Hide Sliders' : 'Fine-Tune Sliders'}
                </button>
              </div>
            </div>

            {/* Acoustic Sliders Area (Pitch, Speed, Breathing Pause, Style Intensity) */}
            {showAcousticControls && (
              <div className={`p-4 rounded-xl border space-y-4 animate-fadeIn ${theme.panelBg}`}>
                {/* Pitch Slider with Baritone / Natural / Crisp Presets */}
                <div>
                  <div className="flex justify-between items-center text-xs mb-1.5">
                    <span className="font-semibold flex items-center gap-1.5">
                      Vocal Pitch Offset
                      <span className={`text-[11px] font-normal ${theme.textMuted}`}>
                        (Baritone Depth vs High Tone)
                      </span>
                    </span>
                    <div className="flex items-center gap-2">
                      <span className={`font-mono font-bold text-xs ${isDarkMode ? 'text-white' : 'text-black'}`}>
                        {pitch > 0 ? `+${pitch}Hz` : `${pitch}Hz`}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setPitch(-4)}
                          className={`text-[10px] px-2 py-0.5 rounded font-semibold transition-all border ${pitch === -4
                            ? isDarkMode
                              ? 'bg-white text-black border-white'
                              : 'bg-black text-white border-black'
                            : isDarkMode
                              ? 'bg-zinc-900 text-zinc-300 border-zinc-800 hover:bg-zinc-800'
                              : 'bg-zinc-100 text-zinc-700 border-zinc-200 hover:bg-zinc-200'
                            }`}
                          title="Deep Baritone (Signature Adam Narrator)"
                        >
                          Deep Baritone (-4Hz)
                        </button>
                        <button
                          type="button"
                          onClick={() => setPitch(0)}
                          className={`text-[10px] px-2 py-0.5 rounded font-semibold transition-all border ${pitch === 0
                            ? isDarkMode
                              ? 'bg-white text-black border-white'
                              : 'bg-black text-white border-black'
                            : isDarkMode
                              ? 'bg-zinc-900 text-zinc-300 border-zinc-800 hover:bg-zinc-800'
                              : 'bg-zinc-100 text-zinc-700 border-zinc-200 hover:bg-zinc-200'
                            }`}
                        >
                          Natural (0)
                        </button>
                        <button
                          type="button"
                          onClick={() => setPitch(3)}
                          className={`text-[10px] px-2 py-0.5 rounded font-semibold transition-all border ${pitch === 3
                            ? isDarkMode
                              ? 'bg-white text-black border-white'
                              : 'bg-black text-white border-black'
                            : isDarkMode
                              ? 'bg-zinc-900 text-zinc-300 border-zinc-800 hover:bg-zinc-800'
                              : 'bg-zinc-100 text-zinc-700 border-zinc-200 hover:bg-zinc-200'
                            }`}
                          title="Bright / Higher Tone"
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
                    className={`w-full cursor-pointer h-1.5 rounded-lg ${isDarkMode ? 'accent-white bg-zinc-800' : 'accent-black bg-zinc-300'
                      }`}
                  />
                  <div className={`flex justify-between text-[10px] ${theme.textMuted} mt-1`}>
                    <span>Deep Resonant Baritone (-15Hz)</span>
                    <span>Natural Baseline (0Hz)</span>
                    <span>Higher Pitch (+15Hz)</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 border-t border-inherit">
                  {/* Speed / Cadence Slider */}
                  <div>
                    <div className="flex justify-between items-center text-xs mb-1">
                      <span className="font-semibold">Speaking Pace</span>
                      <span className={`font-mono text-xs font-bold ${isDarkMode ? 'text-white' : 'text-black'}`}>
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
                      className={`w-full cursor-pointer h-1.5 rounded-lg ${isDarkMode ? 'accent-white bg-zinc-800' : 'accent-black bg-zinc-300'
                        }`}
                    />
                    <div className={`flex justify-between text-[10px] ${theme.textMuted} mt-0.5`}>
                      <span>Slow (-30%)</span>
                      <span className={`font-semibold ${isDarkMode ? 'text-zinc-200' : 'text-zinc-800'}`}>Default (-8%)</span>
                      <span>Fast (+30%)</span>
                    </div>
                  </div>

                  {/* Breathing Pause Slider */}
                  <div>
                    <div className="flex justify-between items-center text-xs mb-1">
                      <span className="font-semibold"> Breath & Pause</span>
                      <span className={`font-mono text-xs font-bold ${isDarkMode ? 'text-white' : 'text-black'}`}>
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
                      className={`w-full cursor-pointer h-1.5 rounded-lg ${isDarkMode ? 'accent-white bg-zinc-800' : 'accent-black bg-zinc-300'
                        }`}
                    />
                    <div className={`flex justify-between text-[10px] ${theme.textMuted} mt-0.5`}>
                      <span>Snappy (0.08s)</span>
                      <span className={`font-semibold ${isDarkMode ? 'text-zinc-200' : 'text-zinc-800'}`}>Natural (0.22s)</span>
                      <span>Dramatic (0.60s)</span>
                    </div>
                  </div>

                  {/* Emotion Style Intensity */}
                  <div>
                    <div className="flex justify-between items-center text-xs mb-1">
                      <span className="font-semibold">Style Intensity</span>
                      <span className={`font-mono text-xs font-bold ${isDarkMode ? 'text-white' : 'text-black'}`}>
                        {styleDegree.toFixed(1)}x
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0.2"
                      max="2.5"
                      step="0.1"
                      value={styleDegree}
                      onChange={(e) => setStyleDegree(parseFloat(e.target.value))}
                      className={`w-full cursor-pointer h-1.5 rounded-lg ${isDarkMode ? 'accent-white bg-zinc-800' : 'accent-black bg-zinc-300'
                        }`}
                    />
                    <div className={`flex justify-between text-[10px] ${theme.textMuted} mt-0.5`}>
                      <span>Subtle (0.2x)</span>
                      <span className={`font-semibold ${isDarkMode ? 'text-zinc-200' : 'text-zinc-800'}`}>Standard (1.0x)</span>
                      <span>Expressive (2.5x)</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Script Editor & Generation Form */}
          <div className={`p-5 sm:p-6 rounded-2xl border backdrop-blur-md space-y-4 ${theme.cardBg}`}>

            {/* Header with Quick Presets */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <label htmlFor="script-textarea" className="text-sm font-semibold tracking-wide">
                  Script / Story Text
                </label>
                <p className={`text-xs ${theme.textMuted}`}>
                  Smart punctuation breathing and pitch normalization are automatically applied.
                </p>
              </div>

              {/* Adam & Studio Script Presets */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className={`text-[11px] ${theme.textMuted} mr-1`}>Samples:</span>
                <button
                  type="button"
                  onClick={() => applyPreset("Deep within the silent ocean trenches lies an untouched realm of darkness and wonder, older than the continents themselves.")}
                  className={`text-[11px] px-2.5 py-1 rounded-md border font-medium transition-all ${isDarkMode
                    ? 'border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white'
                    : 'border-zinc-300 bg-zinc-100 hover:bg-zinc-200 text-zinc-800'
                    }`}
                >
                  Adam Documentary
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset("Welcome back everyone. Today we are exploring artificial intelligence and how neural voice cloning is unlocking new dimensions for creators.")}
                  className={`text-[11px] px-2.5 py-1 rounded-md border font-medium transition-all ${isDarkMode
                    ? 'border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white'
                    : 'border-zinc-300 bg-zinc-100 hover:bg-zinc-200 text-zinc-800'
                    }`}
                >
                  Adam Podcast
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset("In a world divided by shadow and light, only one man possessed the key to the truth... and time was running out.")}
                  className={`text-[11px] px-2.5 py-1 rounded-md border font-medium transition-all ${isDarkMode
                    ? 'border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white'
                    : 'border-zinc-300 bg-zinc-100 hover:bg-zinc-200 text-zinc-800'
                    }`}
                >
                  Cinematic
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset("Every single sunrise is your invitation to take command of your focus, push past every obstacle, and build the future you deserve.")}
                  className={`text-[11px] px-2.5 py-1 rounded-md border font-medium transition-all ${isDarkMode
                    ? 'border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white'
                    : 'border-zinc-300 bg-zinc-100 hover:bg-zinc-200 text-zinc-800'
                    }`}
                >
                  Motivational
                </button>
              </div>
            </div>

            {/* Error Message Alert */}
            {errorMessage && (
              <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm flex items-start gap-3">
                <svg width="20" height="20" className="w-5 h-5 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="break-words">{errorMessage}</div>
              </div>
            )}

            {/* Script Textarea */}
            <div className="relative">
              <textarea
                id="script-textarea"
                rows="6"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Type or paste your text script here. The local model will synthesize audio matching the reference voice..."
                className={`w-full rounded-xl border p-4 text-sm leading-relaxed focus:outline-none transition-all resize-y ${theme.inputBg}`}
                disabled={loading}
              />
              <div className={`flex justify-between items-center text-[11px] ${theme.textMuted} mt-1.5 px-1`}>
                <span>~{estimatedSeconds}s audio est. ({wordCount} words)</span>
                <span>{text.length} characters</span>
              </div>
            </div>

            {/* Generate Button with Soundwave Animation */}
            <button
              onClick={handleGenerateSubmit}
              disabled={loading || !text.trim() || availableVoices.length === 0}
              className={`w-full py-4 px-6 rounded-xl font-bold text-sm transition-all shadow-xl flex items-center justify-center gap-3 ${loading
                ? isDarkMode
                  ? 'bg-zinc-800 text-zinc-400 cursor-not-allowed'
                  : 'bg-zinc-200 text-zinc-500 cursor-not-allowed'
                : theme.btnPrimary
                }`}
            >
              {loading ? (
                <>
                  {/* Animated soundwave bars */}
                  <div className="flex items-center gap-1">
                    <span className={`w-1 h-3 rounded-full animate-bounce [animation-delay:-0.3s] ${isDarkMode ? 'bg-zinc-400' : 'bg-zinc-600'}`}></span>
                    <span className={`w-1 h-5 rounded-full animate-bounce [animation-delay:-0.15s] ${isDarkMode ? 'bg-zinc-300' : 'bg-zinc-700'}`}></span>
                    <span className={`w-1 h-6 rounded-full animate-bounce ${isDarkMode ? 'bg-white' : 'bg-black'}`}></span>
                    <span className={`w-1 h-4 rounded-full animate-bounce [animation-delay:-0.15s] ${isDarkMode ? 'bg-zinc-300' : 'bg-zinc-700'}`}></span>
                    <span className={`w-1 h-2 rounded-full animate-bounce [animation-delay:-0.3s] ${isDarkMode ? 'bg-zinc-400' : 'bg-zinc-600'}`}></span>
                  </div>
                  <span className="tracking-wide">Synthesizing Natural Human Voice...</span>
                </>
              ) : (
                <>
                  <svg width="20" height="20" className="w-5 h-5 fill-none stroke-current" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Synthesize Natural Human Voice</span>
                </>
              )}
            </button>
          </div>

          {/* Active Audio Player Card */}
          {audioUrl && (
            <div className={`p-5 sm:p-6 rounded-2xl border backdrop-blur-md animate-fadeIn ${theme.cardBg}`}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
                  <h3 className="text-sm font-bold tracking-wide">
                    Active Generated Voice
                  </h3>
                </div>
                <a
                  href={audioUrl}
                  download={`synthesized_voice_${Date.now()}.wav`}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${theme.btnPrimary}`}
                >
                  <svg width="14" height="14" className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download .WAV
                </a>
              </div>

              {/* HTML5 Player */}
              <div className={`p-4 rounded-xl border ${theme.panelBg}`}>
                <audio
                  ref={audioPlayerRef}
                  controls
                  className={`w-full h-11 rounded-lg outline-none ${isDarkMode ? 'accent-white' : 'accent-black'
                    }`}
                  src={audioUrl}
                >
                  Your browser does not support HTML5 audio.
                </audio>
              </div>
            </div>
          )}

        </main>

        {/* RIGHT SIDEBAR: History / Past Scripts (4 Columns on desktop) */}
        <aside className="lg:col-span-4 space-y-4">
          <div className={`p-5 rounded-2xl border backdrop-blur-md flex flex-col max-h-[820px] ${theme.sidebarBg}`}>

            {/* Sidebar Header */}
            <div className="flex items-center justify-between pb-3 border-b mb-3 border-inherit">
              <div className="flex items-center gap-2">
                <svg width="16" height="16" className={`w-4 h-4 ${isDarkMode ? 'text-zinc-200' : 'text-zinc-800'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h2 className="text-sm font-bold tracking-wide">
                  History
                </h2>
                <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold border ${isDarkMode
                  ? 'bg-zinc-800 text-zinc-200 border-zinc-700'
                  : 'bg-zinc-200 text-zinc-800 border-zinc-300'
                  }`}>
                  {history.length}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={fetchHistory}
                  disabled={loadingHistory}
                  className={`p-1.5 rounded-lg border transition-all ${isDarkMode
                    ? 'border-zinc-800 hover:bg-zinc-800 text-zinc-400 hover:text-white'
                    : 'border-zinc-300 hover:bg-zinc-200 text-zinc-600 hover:text-black'
                    }`}
                  title="Refresh history"
                >
                  <svg width="14" height="14" className={`w-3.5 h-3.5 ${loadingHistory ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>

                {history.length > 0 && (
                  <button
                    onClick={handleCleanupStorage}
                    className="p-1.5 rounded-lg border border-rose-500/30 text-rose-400 hover:bg-rose-500/10 transition-all"
                    title="Clear history on this device"
                  >
                    <svg width="14" height="14" className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            {/* Search Input for History */}
            {history.length > 0 && (
              <div className="mb-3 relative">
                <input
                  type="text"
                  value={searchHistory}
                  onChange={(e) => setSearchHistory(e.target.value)}
                  placeholder="Filter scripts or voice..."
                  className={`w-full text-xs rounded-lg border px-3 py-2 pl-8 focus:outline-none ${theme.inputBg}`}
                />
                <svg width="14" height="14" className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            )}

            {/* Scrollable History Cards */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {filteredHistory.length === 0 ? (
                <div className={`text-center py-10 px-4 text-xs ${theme.textMuted}`}>
                  {history.length === 0
                    ? 'No conversions recorded yet. Synthesized scripts will appear here with instant replay.'
                    : 'No matching records found.'}
                </div>
              ) : (
                filteredHistory.map((item) => (
                  <div
                    key={item.id}
                    className={`p-3.5 rounded-xl border transition-all space-y-2 group ${isDarkMode
                      ? 'bg-[#18181b] border-zinc-800/80 hover:border-zinc-700'
                      : 'bg-zinc-50 border-zinc-200 hover:border-zinc-300 shadow-sm'
                      }`}
                  >
                    {/* Voice Badge, Emotion Badge & Timestamp */}
                    <div className="flex items-center justify-between text-[11px] gap-1">
                      <div className="flex items-center gap-1.5 truncate max-w-[170px]">
                        <span className={`font-semibold truncate ${isDarkMode ? 'text-zinc-100' : 'text-zinc-900'}`}>
                          {item.referenceVoice}
                        </span>
                        {item.emotion && item.emotion !== 'neutral' && (
                          <span className={`text-[9px] px-1.5 py-0.5 rounded-full border capitalize shrink-0 font-medium ${isDarkMode
                            ? 'bg-zinc-800 text-zinc-300 border-zinc-700'
                            : 'bg-zinc-200 text-zinc-700 border-zinc-300'
                            }`}>
                            {item.emotion}
                          </span>
                        )}
                      </div>
                      <span className={theme.textMuted}>
                        {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    {/* Script Snippet */}
                    <p className={`text-xs line-clamp-2 italic ${isDarkMode ? 'text-zinc-300' : 'text-zinc-700'}`}>
                      "{item.text}"
                    </p>

                    {/* Card Actions */}
                    <div className="pt-2 flex items-center justify-between border-t border-inherit text-xs">
                      {/* Reuse Script */}
                      <button
                        onClick={() => setText(item.text.replace(/\.\.\.$/, ''))}
                        className={`text-[11px] font-medium transition-colors ${isDarkMode ? 'text-zinc-400 hover:text-white' : 'text-zinc-500 hover:text-black'
                          }`}
                        title="Copy text back to editor"
                      >
                        Use Script
                      </button>

                      <div className="flex items-center gap-1.5">
                        {/* Quick Play Button */}
                        <button
                          onClick={() => handleQuickPlay(item.audioUrl)}
                          className={`px-2.5 py-1 rounded-md font-semibold text-[11px] flex items-center gap-1 border transition-all ${isDarkMode
                            ? 'bg-zinc-800 hover:bg-zinc-700 text-white border-zinc-700'
                            : 'bg-zinc-900 hover:bg-zinc-800 text-white border-zinc-900'
                            }`}
                        >
                          <svg width="12" height="12" className="w-3 h-3 fill-current" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                          </svg>
                          Play
                        </button>

                        {/* Direct Download Link */}
                        <a
                          href={item.audioUrl.startsWith('http') ? item.audioUrl : `${API_BASE}${item.audioUrl}`}
                          download={`voice_${item.id}.wav`}
                          className={`p-1 rounded-md border transition-all ${isDarkMode
                            ? 'border-zinc-800 hover:bg-zinc-800 text-zinc-300'
                            : 'border-zinc-300 hover:bg-zinc-100 text-zinc-700'
                            }`}
                          title="Download Audio"
                        >
                          <svg width="12" height="12" className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                        </a>

                        {/* Remove from this device */}
                        <button
                          onClick={(e) => handleDeleteHistoryItem(item.id, e)}
                          className={`p-1 rounded-md border transition-all ${isDarkMode
                            ? 'border-zinc-800 hover:bg-zinc-800 text-zinc-400 hover:text-rose-400'
                            : 'border-zinc-300 hover:bg-zinc-100 text-zinc-500 hover:text-rose-600'
                            }`}
                          title="Remove from this device"
                        >
                          <svg width="12" height="12" className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

          </div>
        </aside>

      </div>
    </div>
  );
}
