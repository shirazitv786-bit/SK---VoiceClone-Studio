import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

// Backend API URL (can use proxy or direct port 5000)
const API_BASE = 'http://localhost:5000';

export default function App() {
  // Theme state: dark / light
  const [isDarkMode, setIsDarkMode] = useState(true);

  // Server Connectivity State
  const [serverOnline, setServerOnline] = useState(null); // null = checking, true = online, false = offline

  // TTS Generation States
  const [text, setText] = useState('');
  const [referenceVoice, setReferenceVoice] = useState('default.wav');
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

  // History States
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [searchHistory, setSearchHistory] = useState('');
  const audioPlayerRef = useRef(null);

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
        setReferenceVoice(voiceList[0]);
      }
    } catch (err) {
      console.warn('Unable to load voices from server:', err.message);
      setServerOnline(false);
    }
  };

  // Fetch generation history
  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await axios.get(`${API_BASE}/api/history`);
      setHistory(res.data.history || []);
      setServerOnline(true);
    } catch (err) {
      console.warn('Unable to load history:', err.message);
    } finally {
      setLoadingHistory(false);
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
        referenceVoice: referenceVoice
      });

      if (response.data && response.data.success) {
        // Resolve full URL
        const rawUrl = response.data.audioUrl;
        const fullAudioUrl = rawUrl.startsWith('http') ? rawUrl : `${API_BASE}${rawUrl}`;
        setAudioUrl(fullAudioUrl);
        fetchHistory();

        setTimeout(() => {
          if (audioPlayerRef.current) {
            audioPlayerRef.current.currentTime = 0;
            audioPlayerRef.current.play().catch(() => {});
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
        audioPlayerRef.current.play().catch(() => {});
      }
    }, 100);
  };

  // Storage cleanup handler
  const handleCleanupStorage = async () => {
    if (!window.confirm('Are you sure you want to delete all generated audio and clear history?')) {
      return;
    }
    try {
      await axios.delete(`${API_BASE}/api/cleanup-audio?all=true`);
      setHistory([]);
      setAudioUrl(null);
    } catch (err) {
      alert(`Cleanup failed: ${err.response?.data?.details || err.message}`);
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

  // Dynamic Theme Styling Tokens
  const theme = {
    bg: isDarkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900',
    headerBg: isDarkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-white/95 border-slate-200',
    cardBg: isDarkMode ? 'bg-slate-900/80 border-slate-800 shadow-xl' : 'bg-white border-slate-200 shadow-sm',
    panelBg: isDarkMode ? 'bg-slate-950/70 border-slate-800/80' : 'bg-slate-100/80 border-slate-200',
    inputBg: isDarkMode
      ? 'bg-slate-950 border-slate-800 text-slate-100 placeholder-slate-500'
      : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400',
    sidebarBg: isDarkMode ? 'bg-slate-900/70 border-slate-800' : 'bg-slate-100/70 border-slate-200',
    textMuted: isDarkMode ? 'text-slate-400' : 'text-slate-500',
    border: isDarkMode ? 'border-slate-800' : 'border-slate-200'
  };

  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  const estimatedSeconds = Math.ceil(wordCount / 2.5);

  return (
    <div className={`min-h-screen ${theme.bg} font-sans transition-colors duration-200 flex flex-col`}>
      
      {/* Top Navigation Bar */}
      <nav className={`sticky top-0 z-30 border-b backdrop-blur-md px-4 sm:px-6 py-3 flex items-center justify-between ${theme.headerBg}`}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-violet-600 to-emerald-400 flex items-center justify-center shadow-lg shadow-indigo-500/20 shrink-0">
            <svg width="20" height="20" className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 100-6 3 3 0 000 6z" />
            </svg>
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold tracking-tight leading-none flex items-center gap-2">
              VoiceClone Studio
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hidden sm:inline-block">
                XTTS-v2 Local
              </span>
            </h1>
            <p className={`text-xs ${theme.textMuted} mt-0.5 hidden sm:block`}>
              Private, Zero-Cloud Text-to-Speech & Voice Cloning
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
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>Local Engine Ready</span>
            </div>
          )}

          {/* Theme Toggle Button */}
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className={`p-2 rounded-lg border transition-all ${
              isDarkMode ? 'border-slate-800 bg-slate-800/80 hover:bg-slate-700 text-amber-300' : 'border-slate-300 bg-white hover:bg-slate-100 text-slate-700'
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
                  <svg width="16" height="16" className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-md shadow-indigo-600/20 shrink-0 self-start sm:self-center"
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
                  <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">
                    Add Custom Voice Sample (.wav)
                  </span>
                  <button
                    onClick={() => setShowUploadModal(false)}
                    className={`text-xs ${theme.textMuted} hover:text-slate-300`}
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
                    className="text-xs file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-600/20 file:text-indigo-400 hover:file:bg-indigo-600/30 cursor-pointer flex-1"
                  />
                  <button
                    type="submit"
                    disabled={uploading || !uploadFile}
                    className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-xs font-semibold text-white transition-all shrink-0 flex items-center justify-center gap-2"
                  >
                    {uploading ? (
                      <>
                        <svg width="14" height="14" className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
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
                    className={`mt-2.5 text-xs p-2.5 rounded-lg border ${
                      uploadFeedback.type === 'success'
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                        : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                    }`}
                  >
                    {uploadFeedback.text}
                  </div>
                )}
              </div>
            )}

            {/* Voice Dropdown */}
            <div className="relative">
              <select
                id="voice-selector"
                value={referenceVoice}
                onChange={(e) => setReferenceVoice(e.target.value)}
                disabled={loading || availableVoices.length === 0}
                className={`w-full appearance-none rounded-xl border px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all cursor-pointer disabled:opacity-60 font-medium ${theme.inputBg}`}
              >
                {availableVoices.length === 0 ? (
                  <option value="">No voices available. Upload a .wav file above.</option>
                ) : (
                  availableVoices.map((voice) => (
                    <option key={voice} value={voice}>
                      {voice}
                    </option>
                  ))
                )}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-400">
                <svg width="16" height="16" className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
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
                  Long scripts are automatically parsed into safe chunks to prevent memory overflows.
                </p>
              </div>

              {/* Preset Buttons */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className={`text-[11px] ${theme.textMuted} mr-1`}>Sample:</span>
                <button
                  type="button"
                  onClick={() => applyPreset("Welcome to our local AI voice cloning studio! Everything runs 100% on your local machine with PyTorch and XTTS-v2.")}
                  className={`text-[11px] px-2.5 py-1 rounded-md border transition-all ${
                    isDarkMode ? 'border-slate-800 bg-slate-800 hover:bg-slate-700 text-slate-300' : 'border-slate-300 bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  Intro
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset("In a distant realm, the stars whispered forgotten secrets to travelers wandering beneath the silent moonlit forest.")}
                  className={`text-[11px] px-2.5 py-1 rounded-md border transition-all ${
                    isDarkMode ? 'border-slate-800 bg-slate-800 hover:bg-slate-700 text-slate-300' : 'border-slate-300 bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  Narrative
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
                className={`w-full rounded-xl border p-4 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all resize-y ${theme.inputBg}`}
                disabled={loading}
              />
              <div className="flex justify-between items-center text-[11px] text-slate-400 mt-1.5 px-1">
                <span>~{estimatedSeconds}s audio est. ({wordCount} words)</span>
                <span>{text.length} characters</span>
              </div>
            </div>

            {/* Generate Button with Soundwave Animation */}
            <button
              onClick={handleGenerateSubmit}
              disabled={loading || !text.trim() || availableVoices.length === 0}
              className={`w-full py-4 px-6 rounded-xl font-bold text-sm text-white transition-all shadow-xl flex items-center justify-center gap-3 ${
                loading
                  ? 'bg-slate-800 cursor-not-allowed opacity-90'
                  : 'bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 hover:from-indigo-500 hover:to-violet-500 active:scale-[0.99] shadow-indigo-500/25'
              }`}
            >
              {loading ? (
                <>
                  {/* Animated soundwave bars */}
                  <div className="flex items-center gap-1">
                    <span className="w-1 h-3 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                    <span className="w-1 h-5 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                    <span className="w-1 h-6 bg-indigo-300 rounded-full animate-bounce"></span>
                    <span className="w-1 h-4 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                    <span className="w-1 h-2 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                  </div>
                  <span className="tracking-wide">Synthesizing with XTTS-v2 Engine...</span>
                </>
              ) : (
                <>
                  <svg width="20" height="20" className="w-5 h-5 text-indigo-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Synthesize Cloned Voice</span>
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
                  download="cloned_voice.wav"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-md shadow-indigo-600/20"
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
                  className="w-full h-11 accent-indigo-500 rounded-lg outline-none"
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
                <svg width="16" height="16" className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h2 className="text-sm font-bold tracking-wide">
                  History
                </h2>
                <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  {history.length}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={fetchHistory}
                  disabled={loadingHistory}
                  className={`p-1.5 rounded-lg border transition-all ${
                    isDarkMode ? 'border-slate-800 hover:bg-slate-800 text-slate-400' : 'border-slate-300 hover:bg-slate-200 text-slate-600'
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
                    title="Clear all audio files and history"
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
                  className={`w-full text-xs rounded-lg border px-3 py-2 pl-8 focus:outline-none focus:ring-1 focus:ring-indigo-500 ${theme.inputBg}`}
                />
                <svg width="14" height="14" className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            )}

            {/* Scrollable History Cards */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {filteredHistory.length === 0 ? (
                <div className="text-center py-10 px-4 text-xs text-slate-500">
                  {history.length === 0
                    ? 'No conversions recorded yet. Synthesized scripts will appear here with instant replay.'
                    : 'No matching records found.'}
                </div>
              ) : (
                filteredHistory.map((item) => (
                  <div
                    key={item.id}
                    className={`p-3.5 rounded-xl border transition-all space-y-2 group ${
                      isDarkMode
                        ? 'bg-slate-950/80 border-slate-800/80 hover:border-slate-700'
                        : 'bg-white border-slate-200 hover:border-indigo-300 shadow-sm'
                    }`}
                  >
                    {/* Voice Badge & Timestamp */}
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-indigo-400 truncate max-w-[140px]">
                        {item.referenceVoice}
                      </span>
                      <span className={theme.textMuted}>
                        {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    {/* Script Snippet */}
                    <p className={`text-xs line-clamp-2 italic ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                      "{item.text}"
                    </p>

                    {/* Card Actions */}
                    <div className="pt-2 flex items-center justify-between border-t border-inherit text-xs">
                      {/* Reuse Script */}
                      <button
                        onClick={() => setText(item.text.replace(/\.\.\.$/, ''))}
                        className={`text-[11px] font-medium transition-colors ${
                          isDarkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-900'
                        }`}
                        title="Copy text back to editor"
                      >
                        Use Script
                      </button>

                      <div className="flex items-center gap-1.5">
                        {/* Quick Play Button */}
                        <button
                          onClick={() => handleQuickPlay(item.audioUrl)}
                          className="px-2.5 py-1 rounded-md bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 font-semibold text-[11px] flex items-center gap-1 border border-emerald-500/30 transition-all"
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
                          className={`p-1 rounded-md border transition-all ${
                            isDarkMode ? 'border-slate-800 hover:bg-slate-800 text-slate-400' : 'border-slate-300 hover:bg-slate-100 text-slate-600'
                          }`}
                          title="Download Audio"
                        >
                          <svg width="12" height="12" className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                        </a>
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
