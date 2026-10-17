import React, { useState, useEffect, useRef, useMemo } from 'react';
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

// Language Flag & Display Mapping
const LANGUAGE_META = {
  'All': { label: 'All Languages', flag: '🌐' },
  'English (US)': { label: 'English (US)', flag: '🇺🇸', code: 'en' },
  'English (UK)': { label: 'English (UK)', flag: '🇬🇧', code: 'en' },
  'English (Canada)': { label: 'English (Canada)', flag: '🇨🇦', code: 'en' },
  'English (Ireland)': { label: 'English (Ireland)', flag: '🇮🇪', code: 'en' },
  'English (Australia)': { label: 'English (Australia)', flag: '🇦🇺', code: 'en' },
  'English (New Zealand)': { label: 'English (NZ)', flag: '🇳🇿', code: 'en' },
  'English (South Africa)': { label: 'English (South Africa)', flag: '🇿🇦', code: 'en' },
  'English (India)': { label: 'English (India)', flag: '🇮🇳', code: 'en' },
  'Urdu (Pakistan)': { label: 'Urdu (Pakistan) - اردو', flag: '🇵🇰', code: 'ur' },
  'Urdu (India)': { label: 'Urdu (India) - اردو', flag: '🇮🇳', code: 'ur' },
  'Hindi (India)': { label: 'Hindi (India) - हिन्दी', flag: '🇮🇳', code: 'hi' },
  'Arabic (Saudi Arabia)': { label: 'Arabic (Saudi) - العربية', flag: '🇸🇦', code: 'ar' },
  'Arabic (Egypt)': { label: 'Arabic (Egypt) - مصر', flag: '🇪🇬', code: 'ar' },
  'Arabic (UAE)': { label: 'Arabic (UAE) - الإمارات', flag: '🇦🇪', code: 'ar' },
  'Arabic (Morocco)': { label: 'Arabic (Morocco) - المغرب', flag: '🇲🇦', code: 'ar' },
  'Arabic (Lebanon)': { label: 'Arabic (Lebanon) - لبنان', flag: '🇱🇧', code: 'ar' },
  'Arabic (Jordan)': { label: 'Arabic (Jordan) - الأردن', flag: '🇯🇴', code: 'ar' },
  'Arabic (Kuwait)': { label: 'Arabic (Kuwait) - الكويت', flag: '🇰🇼', code: 'ar' },
  'Chinese (Mandarin)': { label: 'Chinese (Mandarin) - 中文', flag: '🇨🇳', code: 'zh' },
  'Chinese (Cantonese)': { label: 'Chinese (Cantonese) - 粵語', flag: '🇭🇰', code: 'zh' },
  'Chinese (Taiwan)': { label: 'Chinese (Taiwan) - 國語', flag: '🇹🇼', code: 'zh' },
  'Spanish (Spain)': { label: 'Spanish (Spain) - Español', flag: '🇪🇸', code: 'es' },
  'Spanish (Mexico)': { label: 'Spanish (Mexico)', flag: '🇲🇽', code: 'es' },
  'Spanish (Argentina)': { label: 'Spanish (Argentina)', flag: '🇦🇷', code: 'es' },
  'Spanish (Colombia)': { label: 'Spanish (Colombia)', flag: '🇨🇴', code: 'es' },
  'French (France)': { label: 'French (France) - Français', flag: '🇫🇷', code: 'fr' },
  'French (Canada)': { label: 'French (Canada)', flag: '🇨🇦', code: 'fr' },
  'German (Germany)': { label: 'German (Germany) - Deutsch', flag: '🇩🇪', code: 'de' },
  'German (Austria)': { label: 'German (Austria)', flag: '🇦🇹', code: 'de' },
  'Japanese (Japan)': { label: 'Japanese (Japan) - 日本語', flag: '🇯🇵', code: 'ja' },
  'Korean (South Korea)': { label: 'Korean (Korea) - 한국어', flag: '🇰🇷', code: 'ko' },
  'Italian (Italy)': { label: 'Italian (Italy) - Italiano', flag: '🇮🇹', code: 'it' },
  'Russian (Russia)': { label: 'Russian (Russia) - Русский', flag: '🇷🇺', code: 'ru' },
  'Portuguese (Brazil)': { label: 'Portuguese (Brazil) - Português', flag: '🇧🇷', code: 'pt' },
  'Portuguese (Portugal)': { label: 'Portuguese (Portugal)', flag: '🇵🇹', code: 'pt' }
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
  const [voiceRegistry, setVoiceRegistry] = useState([]);
  const [errorMessage, setErrorMessage] = useState(null);

  // Voice Library Modal & Search/Filter States
  const [showVoiceLibrary, setShowVoiceLibrary] = useState(false);
  const [librarySearch, setLibrarySearch] = useState('');
  const [selectedLangFilter, setSelectedLangFilter] = useState('All');
  const [selectedCatFilter, setSelectedCatFilter] = useState('All');
  const [selectedGenderFilter, setSelectedGenderFilter] = useState('All');
  const [cardPlayingId, setCardPlayingId] = useState(null);
  const cardAudioRef = useRef(null);

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

  // Voice Preview States (Main Bar)
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

  // Currently Selected Voice Object
  const currentVoiceObj = useMemo(() => {
    return voiceRegistry.find(
      (v) => v.filename === referenceVoice || v.name === referenceVoice
    ) || null;
  }, [voiceRegistry, referenceVoice]);

  // Main Preview Voice Handler
  const handlePreviewVoice = () => {
    if (!referenceVoice) return;
    try {
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
      }
      if (cardAudioRef.current) {
        cardAudioRef.current.pause();
        setCardPlayingId(null);
      }
      const audio = new Audio(`${API_BASE}/voices/${encodeURIComponent(referenceVoice)}`);
      previewAudioRef.current = audio;
      setPreviewingVoice(true);
      audio.play().catch((e) => {
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

  // Card Audio Preview Toggle
  const handleToggleCardPreview = (voiceItem, e) => {
    if (e) e.stopPropagation();
    try {
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
        setPreviewingVoice(false);
      }
      if (cardAudioRef.current) {
        cardAudioRef.current.pause();
        if (cardPlayingId === voiceItem.id) {
          setCardPlayingId(null);
          return;
        }
      }
      const audio = new Audio(`${API_BASE}/voices/${encodeURIComponent(voiceItem.filename)}`);
      cardAudioRef.current = audio;
      setCardPlayingId(voiceItem.id);
      audio.play().catch((err) => {
        console.warn('Card playback error:', err);
        setCardPlayingId(null);
      });
      audio.onended = () => setCardPlayingId(null);
      audio.onerror = () => setCardPlayingId(null);
    } catch (err) {
      setCardPlayingId(null);
    }
  };

  // Select Voice from Library Modal
  const handleSelectVoiceFromLibrary = (voiceItem, autoFillSample = false) => {
    setReferenceVoice(voiceItem.filename);
    if (autoFillSample && voiceItem.previewText) {
      setText(voiceItem.previewText);
    }
    if (cardAudioRef.current) {
      cardAudioRef.current.pause();
      setCardPlayingId(null);
    }
    setShowVoiceLibrary(false);
  };

  // Load Native Sample Script for current voice
  const handleLoadNativeSample = () => {
    if (currentVoiceObj && currentVoiceObj.previewText) {
      setText(currentVoiceObj.previewText);
    }
  };

  // Check backend health & fetch available voices + registry
  const fetchVoices = async (preferredSelection = null) => {
    try {
      const res = await axios.get(`${API_BASE}/api/voices`);
      const voiceList = res.data.voices || [];
      const registryList = res.data.registry || [];
      setAvailableVoices(voiceList);
      setVoiceRegistry(registryList);
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

  // Fetch generation history for THIS device from server
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
        deviceId: getDeviceId(),
        language: currentVoiceObj?.languageCode || 'en'
      });

      if (response.data && response.data.success) {
        const rawUrl = response.data.audioUrl;
        const fullAudioUrl = rawUrl.startsWith('http') ? rawUrl : `${API_BASE}${rawUrl}`;
        setAudioUrl(fullAudioUrl);

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

  // Storage cleanup handler - Clears history on THIS device only
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

  // Delete an individual history item from THIS device
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

  // Filter history based on search
  const filteredHistory = history.filter(
    (item) =>
      item.text.toLowerCase().includes(searchHistory.toLowerCase()) ||
      item.referenceVoice.toLowerCase().includes(searchHistory.toLowerCase())
  );

  // Filter Voice Library Voices
  const filteredLibraryVoices = useMemo(() => {
    return voiceRegistry.filter((v) => {
      const matchesSearch =
        !librarySearch ||
        v.name.toLowerCase().includes(librarySearch.toLowerCase()) ||
        v.description?.toLowerCase().includes(librarySearch.toLowerCase()) ||
        v.language?.toLowerCase().includes(librarySearch.toLowerCase()) ||
        v.category?.toLowerCase().includes(librarySearch.toLowerCase()) ||
        v.tags?.some((t) => t.toLowerCase().includes(librarySearch.toLowerCase()));

      const matchesLang =
        selectedLangFilter === 'All' ||
        v.language?.toLowerCase().includes(selectedLangFilter.toLowerCase()) ||
        (selectedLangFilter === 'English' && v.language?.toLowerCase().includes('english')) ||
        (selectedLangFilter === 'Urdu' && v.language?.toLowerCase().includes('urdu')) ||
        (selectedLangFilter === 'Hindi' && v.language?.toLowerCase().includes('hindi')) ||
        (selectedLangFilter === 'Arabic' && v.language?.toLowerCase().includes('arabic')) ||
        (selectedLangFilter === 'Chinese' && v.language?.toLowerCase().includes('chinese')) ||
        (selectedLangFilter === 'Spanish' && v.language?.toLowerCase().includes('spanish')) ||
        (selectedLangFilter === 'French' && v.language?.toLowerCase().includes('french')) ||
        (selectedLangFilter === 'German' && v.language?.toLowerCase().includes('german')) ||
        (selectedLangFilter === 'Japanese' && v.language?.toLowerCase().includes('japanese')) ||
        (selectedLangFilter === 'Korean' && v.language?.toLowerCase().includes('korean')) ||
        (selectedLangFilter === 'Italian' && v.language?.toLowerCase().includes('italian')) ||
        (selectedLangFilter === 'Russian' && v.language?.toLowerCase().includes('russian')) ||
        (selectedLangFilter === 'Portuguese' && v.language?.toLowerCase().includes('portuguese'));

      const matchesCat = selectedCatFilter === 'All' || v.category === selectedCatFilter;
      const matchesGender = selectedGenderFilter === 'All' || v.gender === selectedGenderFilter;

      return matchesSearch && matchesLang && matchesCat && matchesGender;
    });
  }, [voiceRegistry, librarySearch, selectedLangFilter, selectedCatFilter, selectedGenderFilter]);

  // Categories list for tabs
  const libraryCategories = useMemo(() => {
    const cats = Array.from(new Set(voiceRegistry.map((v) => v.category).filter(Boolean)));
    return ['All', ...cats];
  }, [voiceRegistry]);

  // Dynamic Theme Styling Tokens - Monochromatic Luxury (Black & White with subtle zinc)
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
      : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-900 border border-zinc-300'
  };

  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  const estimatedSeconds = Math.ceil(wordCount / 2.5);

  // Group available voices for grouped dropdown
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
    // Fallback if registry not yet loaded
    const adamVoices = availableVoices.filter((v) => v.toLowerCase().includes('adam'));
    const otherVoices = availableVoices.filter((v) => !v.toLowerCase().includes('adam'));
    return {
      'ElevenLabs Flagship': adamVoices.map((filename) => ({ filename, name: filename })),
      'Studio Neural & Multilingual': otherVoices.map((filename) => ({ filename, name: filename }))
    };
  }, [voiceRegistry, availableVoices]);

  return (
    <div className={`min-h-screen ${theme.bg} font-sans transition-colors duration-200 flex flex-col`}>
      {/* Top Navigation Bar */}
      <nav className={`sticky top-0 z-30 border-b backdrop-blur-md px-4 sm:px-6 py-3.5 flex items-center justify-between ${theme.headerBg}`}>
        <div className="flex items-center gap-3">
          <div
            className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 transition-all ${
              isDarkMode ? 'bg-white text-black shadow-md shadow-white/5' : 'bg-black text-white shadow-md shadow-black/10'
            }`}
          >
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
            <h1 className="text-base sm:text-lg font-bold tracking-tight leading-none flex items-center gap-2">
              SK - VoiceClone Studio
              <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${
                isDarkMode ? 'bg-zinc-800 text-zinc-300 border-zinc-700' : 'bg-zinc-200 text-zinc-900 border-zinc-300'
              }`}>
                120 Human Models
              </span>
            </h1>
            <p className={`text-xs ${theme.textMuted} mt-0.5 hidden sm:block font-medium`}>
              ElevenLabs-Style Multilingual Neural Suite • 100% Studio Quality
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Browse 120 Voices Library Button */}
          <button
            type="button"
            onClick={() => setShowVoiceLibrary(true)}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm ${
              isDarkMode
                ? 'bg-gradient-to-r from-zinc-800 to-zinc-700 hover:from-zinc-700 hover:to-zinc-600 text-white border border-zinc-600'
                : 'bg-zinc-900 hover:bg-black text-white border border-zinc-800'
            }`}
          >
            <span className="text-sm">🎙️</span>
            <span>Browse 120 Voices</span>
            <span className="hidden sm:inline-block ml-1 px-1.5 py-0.2 bg-white/20 rounded text-[10px] font-mono">
              Library
            </span>
          </button>

          {/* Server Connection Pill */}
          {serverOnline === false ? (
            <div
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20"
              title="Backend server not responding. Run: node server.js"
            >
              <span className="w-2 h-2 rounded-full bg-rose-400"></span>
              <span>Backend Offline</span>
            </div>
          ) : (
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border ${
                isDarkMode ? 'bg-zinc-900 text-zinc-300 border-zinc-800' : 'bg-zinc-100 text-zinc-800 border-zinc-200'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="hidden md:inline">120 Voices Ready</span>
              <span className="md:hidden">Ready</span>
            </div>
          )}

          {/* Theme Toggle Button */}
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className={`p-2 rounded-xl border transition-all ${
              isDarkMode
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
          <button onClick={() => fetchVoices()} className="underline font-semibold ml-2 hover:text-amber-200">
            Retry Connection
          </button>
        </div>
      )}

      {/* Main Studio Body: 2-Column Responsive Layout */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT / MAIN WORKSPACE AREA (8 Columns on desktop) */}
        <main className="lg:col-span-8 space-y-6">
          {/* Target Voice Selection & Profile Card */}
          <div className={`p-5 rounded-2xl border backdrop-blur-md ${theme.cardBg}`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <label htmlFor="voice-selector" className="text-sm font-semibold tracking-wide flex items-center gap-2">
                  <svg width="16" height="16" className={`w-4 h-4 ${isDarkMode ? 'text-zinc-300' : 'text-zinc-800'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 100-6 3 3 0 000 6z" />
                  </svg>
                  Target Reference Voice Model
                  <span className={`text-[11px] font-mono font-medium px-2 py-0.5 rounded-full ${
                    isDarkMode ? 'bg-zinc-800 text-zinc-300' : 'bg-zinc-200 text-zinc-800'
                  }`}>
                    {voiceRegistry.length || availableVoices.length} Available
                  </span>
                </label>
                <p className={`text-xs ${theme.textMuted} mt-0.5`}>
                  Select from 120 unique human models across English, Urdu, Hindi, Arabic, Chinese & more.
                </p>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-center">
                {/* Voice Library Explorer Button */}
                <button
                  type="button"
                  onClick={() => setShowVoiceLibrary(true)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${theme.btnSecondary}`}
                  title="Open visual Voice Library with search, filter tabs, and audio cards"
                >
                  <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7" />
                  </svg>
                  <span>Explore Voice Library</span>
                </button>

                {/* Upload Voice Toggle Button */}
                <button
                  type="button"
                  onClick={() => setShowUploadModal(!showUploadModal)}
                  className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${theme.btnPrimary}`}
                >
                  <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                  </svg>
                  Upload
                </button>
              </div>
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
                    className={`text-xs file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold cursor-pointer flex-1 ${
                      isDarkMode
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
                    className={`mt-2.5 text-xs p-2.5 rounded-lg border ${
                      uploadFeedback.type === 'success'
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
                  className={`w-full appearance-none rounded-xl border px-4 py-3 text-sm focus:outline-none transition-all cursor-pointer disabled:opacity-60 font-medium ${theme.inputBg}`}
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
                title="Listen to high-definition reference sample of this voice"
              >
                {previewingVoice ? (
                  <>
                    <svg width="14" height="14" className="animate-spin h-3.5 w-3.5 fill-current" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Playing Voice Sample...</span>
                  </>
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

            {/* Selected Voice Profile Summary Card */}
            {currentVoiceObj && (
              <div className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${theme.panelBg}`}>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-base">
                      {LANGUAGE_META[currentVoiceObj.language]?.flag || '🌐'}
                    </span>
                    <span className="font-bold text-zinc-100 dark:text-zinc-100">
                      {currentVoiceObj.name}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                      isDarkMode ? 'bg-zinc-800 text-zinc-300 border-zinc-700' : 'bg-zinc-200 text-zinc-800 border-zinc-300'
                    }`}>
                      {currentVoiceObj.language}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                      currentVoiceObj.gender === 'Female' ? 'bg-fuchsia-500/20 text-fuchsia-300' : 'bg-blue-500/20 text-blue-300'
                    }`}>
                      {currentVoiceObj.gender}
                    </span>
                  </div>
                  <p className={`${theme.textMuted} text-[11px] leading-relaxed`}>
                    {currentVoiceObj.description}
                  </p>
                </div>

                {/* Instant Action: Load Native Sample Script */}
                {currentVoiceObj.previewText && (
                  <button
                    type="button"
                    onClick={handleLoadNativeSample}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 border self-start sm:self-center flex items-center gap-1.5 ${
                      isDarkMode
                        ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border-zinc-700'
                        : 'bg-white hover:bg-zinc-100 text-zinc-900 border-zinc-300 shadow-sm'
                    }`}
                    title="Populates the script box with an authentic native sentence for this voice"
                  >
                    <span>✍️</span>
                    <span>Load Native Sample Script</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Human Tone, Pitch & Delivery Studio Panel */}
          <div className={`p-5 rounded-2xl border backdrop-blur-md space-y-4 ${theme.cardBg}`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-inherit">
              <div className="flex items-center gap-2.5">
                <div>
                  <h3 className="text-sm font-bold tracking-wide flex items-center gap-2">
                    Human Tone, Pitch & Delivery Studio
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                        isDarkMode ? 'bg-zinc-800 text-zinc-300 border-zinc-700' : 'bg-zinc-200 text-zinc-800 border-zinc-300'
                      }`}
                    >
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
                  className={`text-xs font-medium px-2.5 py-1 rounded-lg border transition-all ${
                    isDarkMode
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
                  className={`text-xs font-semibold px-2.5 py-1 rounded-lg transition-all border ${
                    isDarkMode
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
                          className={`text-[10px] px-2 py-0.5 rounded font-semibold transition-all border ${
                            pitch === -4
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
                          className={`text-[10px] px-2 py-0.5 rounded font-semibold transition-all border ${
                            pitch === 0
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
                          className={`text-[10px] px-2 py-0.5 rounded font-semibold transition-all border ${
                            pitch === 3
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
                    className={`w-full cursor-pointer h-1.5 rounded-lg ${
                      isDarkMode ? 'accent-white bg-zinc-800' : 'accent-black bg-zinc-300'
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
                      className={`w-full cursor-pointer h-1.5 rounded-lg ${
                        isDarkMode ? 'accent-white bg-zinc-800' : 'accent-black bg-zinc-300'
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
                      <span className="font-semibold">Breath & Pause</span>
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
                      className={`w-full cursor-pointer h-1.5 rounded-lg ${
                        isDarkMode ? 'accent-white bg-zinc-800' : 'accent-black bg-zinc-300'
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
                      className={`w-full cursor-pointer h-1.5 rounded-lg ${
                        isDarkMode ? 'accent-white bg-zinc-800' : 'accent-black bg-zinc-300'
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
            {/* Header with Multilingual Quick Presets */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <label htmlFor="script-textarea" className="text-sm font-semibold tracking-wide">
                  Script / Story Text
                </label>
                <p className={`text-xs ${theme.textMuted}`}>
                  Smart punctuation breathing and pitch normalization are automatically applied.
                </p>
              </div>

              {/* Sample Script Quick Presets */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className={`text-[11px] ${theme.textMuted} mr-1`}>Samples:</span>
                <button
                  type="button"
                  onClick={() => setText("Deep within the silent ocean trenches lies an untouched realm of darkness and wonder, older than the continents themselves.")}
                  className={`text-[11px] px-2.5 py-1 rounded-md border font-medium transition-all ${
                    isDarkMode
                      ? 'border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white'
                      : 'border-zinc-300 bg-zinc-100 hover:bg-zinc-200 text-zinc-800'
                  }`}
                >
                  English Documentary
                </button>
                <button
                  type="button"
                  onClick={() => setText("السلام علیکم۔ زندگی کا ہر نیا دن امید، حوصلے اور خوابوں کو تعبیر دینے کا ایک شاندار موقع ہے۔")}
                  className={`text-[11px] px-2.5 py-1 rounded-md border font-medium transition-all ${
                    isDarkMode
                      ? 'border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white'
                      : 'border-zinc-300 bg-zinc-100 hover:bg-zinc-200 text-zinc-800'
                  }`}
                >
                  Urdu اردو
                </button>
                <button
                  type="button"
                  onClick={() => setText("नमस्ते। सफलता का रहस्य निरंतर प्रयास, अटूट विश्वास और सकारात्मक सोच में छिपा है।")}
                  className={`text-[11px] px-2.5 py-1 rounded-md border font-medium transition-all ${
                    isDarkMode
                      ? 'border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white'
                      : 'border-zinc-300 bg-zinc-100 hover:bg-zinc-200 text-zinc-800'
                  }`}
                >
                  Hindi हिन्दी
                </button>
                <button
                  type="button"
                  onClick={() => setText("مرحباً بكم. المستقبل يُبنى بالإرادة الصادقة والعمل الدؤوب، متطلعين دائماً نحو القمة.")}
                  className={`text-[11px] px-2.5 py-1 rounded-md border font-medium transition-all ${
                    isDarkMode
                      ? 'border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white'
                      : 'border-zinc-300 bg-zinc-100 hover:bg-zinc-200 text-zinc-800'
                  }`}
                >
                  Arabic العربية
                </button>
                <button
                  type="button"
                  onClick={() => setText("大家好。无论前方的道路多么漫长，只要心中怀揣梦想，就一定能迎来光明。")}
                  className={`text-[11px] px-2.5 py-1 rounded-md border font-medium transition-all ${
                    isDarkMode
                      ? 'border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white'
                      : 'border-zinc-300 bg-zinc-100 hover:bg-zinc-200 text-zinc-800'
                  }`}
                >
                  Chinese 中文
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
                placeholder="Type or paste your text script here in any language (English, Urdu, Hindi, Arabic, Chinese, Spanish, French, German, Japanese, Korean, Italian, etc.). The local model will synthesize audio matching the reference voice..."
                disabled={loading}
                className={`w-full rounded-xl border p-4 text-sm focus:outline-none transition-all resize-y leading-relaxed font-normal ${theme.inputBg}`}
              />
              <div className={`absolute bottom-3 right-3 text-xs ${theme.textMuted} flex items-center gap-3 bg-inherit px-2 py-0.5 rounded-md`}>
                <span>{wordCount} words</span>
                <span>•</span>
                <span>~{estimatedSeconds}s audio</span>
              </div>
            </div>

            {/* Emotion Tone Selector Pills */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-semibold tracking-wide">
                  Emotional Expression
                </span>
                <span className={`text-[11px] ${theme.textMuted}`}>
                  Modulates acoustic pitch, rate, and vocal intensity
                </span>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-9 gap-1.5">
                {EMOTION_OPTIONS.map((item) => {
                  const isSelected = emotion === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setEmotion(item.id)}
                      className={`p-2 rounded-xl text-center border transition-all flex flex-col items-center justify-center gap-1 ${
                        isSelected
                          ? isDarkMode
                            ? 'bg-white text-black border-white shadow-md'
                            : 'bg-black text-white border-black shadow-md'
                          : isDarkMode
                          ? 'bg-zinc-900/60 text-zinc-300 border-zinc-800 hover:bg-zinc-800/80 hover:text-white'
                          : 'bg-zinc-100 text-zinc-700 border-zinc-200 hover:bg-zinc-200/80'
                      }`}
                      title={item.tagline}
                    >
                      <span className="text-base">{item.icon}</span>
                      <span className="text-[10px] font-bold tracking-tight leading-tight">
                        {item.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Synthesize Submit Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleGenerateSubmit}
                disabled={loading || !text.trim() || !referenceVoice}
                className={`w-full py-4 rounded-xl text-sm font-bold tracking-wide transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed ${theme.btnPrimary}`}
              >
                {loading ? (
                  <>
                    <svg width="18" height="18" className="animate-spin h-4 w-4 fill-current" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Synthesizing Ultra-Human Audio...</span>
                  </>
                ) : (
                  <>
                    <svg width="18" height="18" className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" />
                    </svg>
                    <span>Synthesize Voice With {currentVoiceObj?.name || referenceVoice}</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Resulting Audio Player Card */}
          {audioUrl && (
            <div className={`p-6 rounded-2xl border backdrop-blur-md space-y-4 animate-fadeIn ${theme.cardBg}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></span>
                  <h3 className="text-sm font-bold tracking-wide">
                    Mastered Output Audio Ready
                  </h3>
                </div>
                <a
                  href={audioUrl}
                  download={`voice_synthesis_${Date.now()}.mp3`}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all ${theme.btnSecondary}`}
                >
                  Download Broadcast MP3
                </a>
              </div>
              <audio
                ref={audioPlayerRef}
                src={audioUrl}
                controls
                className="w-full focus:outline-none"
              />
            </div>
          )}
        </main>

        {/* RIGHT / SIDEBAR AREA (4 Columns on desktop) */}
        <aside className="lg:col-span-4 space-y-6">
          {/* Generation History Isolated to THIS Device */}
          <div className={`p-5 rounded-2xl border backdrop-blur-md space-y-4 ${theme.sidebarBg}`}>
            <div className="flex items-center justify-between pb-2 border-b border-inherit">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold tracking-wide">
                  Recent Generations
                </h3>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                  isDarkMode ? 'bg-zinc-800 text-zinc-300' : 'bg-zinc-200 text-zinc-800'
                }`}>
                  {history.length}
                </span>
              </div>
              {history.length > 0 && (
                <button
                  type="button"
                  onClick={handleCleanupStorage}
                  className={`text-xs ${theme.textMuted} hover:text-rose-400 transition-colors`}
                  title="Clear history on this device only"
                >
                  Clear All
                </button>
              )}
            </div>

            {/* History Search Box */}
            {history.length > 3 && (
              <input
                type="text"
                value={searchHistory}
                onChange={(e) => setSearchHistory(e.target.value)}
                placeholder="Search history..."
                className={`w-full rounded-lg border px-3 py-1.5 text-xs focus:outline-none transition-all ${theme.inputBg}`}
              />
            )}

            {/* History Item Cards List */}
            <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
              {loadingHistory ? (
                <div className={`p-4 text-center text-xs ${theme.textMuted}`}>
                  Loading device history...
                </div>
              ) : filteredHistory.length === 0 ? (
                <div className={`p-6 text-center text-xs ${theme.textMuted} border border-dashed rounded-xl border-inherit`}>
                  No past generations yet. Type your script and click Synthesize to create your first clip.
                </div>
              ) : (
                filteredHistory.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleQuickPlay(item.audioUrl)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all hover:scale-[1.01] flex flex-col gap-2 ${
                      isDarkMode
                        ? 'bg-zinc-900/40 hover:bg-zinc-900 border-zinc-800/80 hover:border-zinc-700'
                        : 'bg-zinc-50 hover:bg-zinc-100 border-zinc-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-xs font-semibold truncate flex-1">
                        {item.referenceVoice.replace('.wav', '')}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => handleDeleteHistoryItem(item.id, e)}
                        className={`text-zinc-500 hover:text-rose-400 p-0.5 rounded transition-colors`}
                        title="Delete this record"
                      >
                        <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>

                    <p className={`text-xs ${theme.textMuted} line-clamp-2 leading-relaxed`}>
                      "{item.text}"
                    </p>

                    <div className="flex items-center justify-between text-[10px] text-zinc-500 pt-1 border-t border-inherit/40">
                      <span>{new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      <span className="flex items-center gap-1 font-semibold text-zinc-400 hover:text-zinc-200">
                        <svg width="12" height="12" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                        Play Audio
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </aside>
      </div>

      {/* =========================================================================
          ELEVENLABS-GRADE VOICE EXPLORER MODAL (120 UNIQUE VOICES)
          ========================================================================= */}
      {showVoiceLibrary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div
            className={`w-full max-w-6xl max-h-[92vh] rounded-2xl border flex flex-col shadow-2xl overflow-hidden ${
              isDarkMode ? 'bg-[#101014] border-zinc-800 text-zinc-100' : 'bg-white border-zinc-300 text-zinc-950'
            }`}
          >
            {/* Modal Header */}
            <div className={`px-6 py-4 border-b flex items-center justify-between shrink-0 ${theme.headerBg}`}>
              <div className="flex items-center gap-3">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                    isDarkMode ? 'bg-white text-black' : 'bg-black text-white'
                  }`}
                >
                  <span className="text-lg">🎙️</span>
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold tracking-tight flex items-center gap-2">
                    120 AI Voice Models Library
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      100% Studio Human Quality
                    </span>
                  </h2>
                  <p className={`text-xs ${theme.textMuted}`}>
                    Explore, preview and select from 120 unique voices across English, Urdu, Hindi, Arabic, Chinese & European languages.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (cardAudioRef.current) {
                    cardAudioRef.current.pause();
                    setCardPlayingId(null);
                  }
                  setShowVoiceLibrary(false);
                }}
                className={`p-2 rounded-xl border transition-all ${theme.btnSecondary}`}
                title="Close Voice Library"
              >
                <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Filter and Search Bar Controls */}
            <div className={`p-4 border-b space-y-3 shrink-0 ${isDarkMode ? 'bg-zinc-900/60 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`}>
              <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center">
                {/* Search Input */}
                <div className="relative flex-1">
                  <svg
                    width="16"
                    height="16"
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    value={librarySearch}
                    onChange={(e) => setLibrarySearch(e.target.value)}
                    placeholder="Search 120 voices by name, language, style, or persona..."
                    className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-xs font-medium focus:outline-none transition-all ${theme.inputBg}`}
                  />
                  {librarySearch && (
                    <button
                      onClick={() => setLibrarySearch('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-400 hover:text-white"
                    >
                      Clear
                    </button>
                  )}
                </div>

                {/* Gender Filter */}
                <div className="flex items-center gap-1 shrink-0">
                  {['All', 'Male', 'Female'].map((gender) => (
                    <button
                      key={gender}
                      type="button"
                      onClick={() => setSelectedGenderFilter(gender)}
                      className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all border ${
                        selectedGenderFilter === gender
                          ? isDarkMode
                            ? 'bg-white text-black border-white'
                            : 'bg-black text-white border-black'
                          : isDarkMode
                          ? 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:bg-zinc-800'
                          : 'bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-100'
                      }`}
                    >
                      {gender === 'All' ? 'All Genders' : gender}
                    </button>
                  ))}
                </div>
              </div>

              {/* Language Pills Bar */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                <span className={`text-[11px] font-semibold ${theme.textMuted} shrink-0 mr-1`}>
                  Language:
                </span>
                {['All', 'English', 'Urdu', 'Hindi', 'Arabic', 'Chinese', 'Spanish', 'French', 'German', 'Japanese', 'Korean', 'Italian', 'Russian', 'Portuguese'].map((lang) => {
                  const isSelected = selectedLangFilter === lang;
                  const flag =
                    lang === 'English' ? '🇺🇸' :
                    lang === 'Urdu' ? '🇵🇰' :
                    lang === 'Hindi' ? '🇮🇳' :
                    lang === 'Arabic' ? '🇸🇦' :
                    lang === 'Chinese' ? '🇨🇳' :
                    lang === 'Spanish' ? '🇪🇸' :
                    lang === 'French' ? '🇫🇷' :
                    lang === 'German' ? '🇩🇪' :
                    lang === 'Japanese' ? '🇯🇵' :
                    lang === 'Korean' ? '🇰🇷' :
                    lang === 'Italian' ? '🇮🇹' :
                    lang === 'Russian' ? '🇷🇺' :
                    lang === 'Portuguese' ? '🇧🇷' : '🌐';
                  return (
                    <button
                      key={lang}
                      type="button"
                      onClick={() => setSelectedLangFilter(lang)}
                      className={`px-3 py-1.5 rounded-lg font-semibold shrink-0 transition-all border flex items-center gap-1.5 text-xs ${
                        isSelected
                          ? isDarkMode
                            ? 'bg-zinc-100 text-zinc-950 border-white'
                            : 'bg-zinc-900 text-white border-zinc-900'
                          : isDarkMode
                          ? 'bg-zinc-900/80 text-zinc-400 border-zinc-800 hover:text-white hover:bg-zinc-800'
                          : 'bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-100'
                      }`}
                    >
                      <span>{flag}</span>
                      <span>{lang}</span>
                    </button>
                  );
                })}
              </div>

              {/* Category Pills Bar */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 text-xs">
                <span className={`text-[11px] font-semibold ${theme.textMuted} shrink-0 mr-1`}>
                  Suite:
                </span>
                {libraryCategories.map((cat) => {
                  const isSelected = selectedCatFilter === cat;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCatFilter(cat)}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-medium shrink-0 transition-all border ${
                        isSelected
                          ? isDarkMode
                            ? 'bg-white text-black border-white'
                            : 'bg-black text-white border-black'
                          : isDarkMode
                          ? 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:bg-zinc-800'
                          : 'bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-100'
                      }`}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Voices Grid (Scrollable) */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {filteredLibraryVoices.length === 0 ? (
                <div className={`col-span-full p-12 text-center text-sm ${theme.textMuted}`}>
                  No voices match your search or filter criteria. Try resetting the filters.
                </div>
              ) : (
                filteredLibraryVoices.map((item) => {
                  const isCurrentlySelected = referenceVoice === item.filename;
                  const isPlaying = cardPlayingId === item.id;
                  const langFlag = LANGUAGE_META[item.language]?.flag || '🌐';

                  return (
                    <div
                      key={item.id}
                      className={`p-4 rounded-xl border transition-all flex flex-col justify-between gap-3 ${
                        isCurrentlySelected
                          ? isDarkMode
                            ? 'bg-zinc-900/90 border-white ring-1 ring-white/50'
                            : 'bg-zinc-50 border-black ring-1 ring-black/40'
                          : isDarkMode
                          ? 'bg-zinc-900/40 hover:bg-zinc-900/80 border-zinc-800/80 hover:border-zinc-700'
                          : 'bg-white hover:bg-zinc-50 border-zinc-200 hover:border-zinc-300 shadow-sm'
                      }`}
                    >
                      <div className="space-y-2">
                        {/* Card Top: Flag, Name, Category */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xl shrink-0">{langFlag}</span>
                            <div>
                              <h4 className="text-xs font-bold tracking-tight text-zinc-100 dark:text-zinc-100 leading-snug">
                                {item.name}
                              </h4>
                              <span className={`text-[10px] font-semibold ${theme.textMuted}`}>
                                {item.category}
                              </span>
                            </div>
                          </div>

                          {/* Gender & Pitch Offset Tag */}
                          <div className="flex flex-col items-end gap-1 shrink-0">
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                                item.gender === 'Female' ? 'bg-fuchsia-500/20 text-fuchsia-300' : 'bg-blue-500/20 text-blue-300'
                              }`}
                            >
                              {item.gender}
                            </span>
                            <span className="text-[9px] font-mono text-zinc-500">
                              {item.pitchBias}
                            </span>
                          </div>
                        </div>

                        {/* Description */}
                        <p className={`text-[11px] ${theme.textMuted} line-clamp-2 leading-relaxed`}>
                          {item.description}
                        </p>

                        {/* Tags */}
                        {item.tags && item.tags.length > 0 && (
                          <div className="flex items-center gap-1 flex-wrap pt-1">
                            {item.tags.slice(0, 3).map((tag) => (
                              <span
                                key={tag}
                                className={`text-[9px] px-1.5 py-0.5 rounded ${
                                  isDarkMode ? 'bg-zinc-800 text-zinc-400' : 'bg-zinc-100 text-zinc-600'
                                }`}
                              >
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Card Actions: Preview & Select */}
                      <div className="pt-2 border-t border-inherit/40 flex items-center justify-between gap-2">
                        {/* Play Reference Sample */}
                        <button
                          type="button"
                          onClick={(e) => handleToggleCardPreview(item, e)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                            isPlaying
                              ? 'bg-emerald-500 text-black font-bold animate-pulse'
                              : isDarkMode
                              ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200'
                              : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-800'
                          }`}
                          title="Play preview audio sample for this voice"
                        >
                          {isPlaying ? (
                            <>
                              <svg width="12" height="12" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                              </svg>
                              <span>Playing...</span>
                            </>
                          ) : (
                            <>
                              <svg width="12" height="12" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M8 5v14l11-7z" />
                              </svg>
                              <span>Sample</span>
                            </>
                          )}
                        </button>

                        {/* Use Voice Button */}
                        <button
                          type="button"
                          onClick={() => handleSelectVoiceFromLibrary(item, true)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                            isCurrentlySelected
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : isDarkMode
                              ? 'bg-white hover:bg-zinc-200 text-black'
                              : 'bg-black hover:bg-zinc-800 text-white'
                          }`}
                          title="Select voice and auto-fill native sample script"
                        >
                          {isCurrentlySelected ? 'Selected ✓' : 'Use Voice'}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className={`px-6 py-3 border-t flex items-center justify-between text-xs ${theme.headerBg}`}>
              <span className={theme.textMuted}>
                Showing <strong className="text-zinc-200">{filteredLibraryVoices.length}</strong> of{' '}
                <strong className="text-zinc-200">{voiceRegistry.length}</strong> unique voices
              </span>
              <button
                type="button"
                onClick={() => {
                  if (cardAudioRef.current) {
                    cardAudioRef.current.pause();
                    setCardPlayingId(null);
                  }
                  setShowVoiceLibrary(false);
                }}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold border ${theme.btnSecondary}`}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
