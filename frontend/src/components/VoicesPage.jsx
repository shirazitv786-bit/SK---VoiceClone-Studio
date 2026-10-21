import React, { useState, useEffect, useRef, useMemo } from 'react';
import axios from 'axios';

// Backend API URL (Supports local dev ports e.g. 5173 and same-origin production deployments)
const isLocalDev = typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') &&
  window.location.port !== '5000' && window.location.port !== '';

const API_BASE = isLocalDev ? 'http://localhost:5000' : '';

// Flag emoji & accent helper based on language name or code
const getLanguageMeta = (lang = '', code = '') => {
  const l = (lang || '').toLowerCase();
  const c = (code || '').toLowerCase();

  if (l.includes('urdu') || c === 'ur') return { flag: '🇵🇰', label: 'Urdu', region: 'Pakistan' };
  if (l.includes('hindi') || c === 'hi') return { flag: '🇮🇳', label: 'Hindi', region: 'India' };
  if (l.includes('arabic') || c === 'ar') return { flag: '🇸🇦', label: 'Arabic', region: 'Middle East' };
  if (l.includes('french') || c === 'fr') return { flag: '🇫🇷', label: 'French', region: 'France' };
  if (l.includes('german') || c === 'de') return { flag: '🇩🇪', label: 'German', region: 'Germany' };
  if (l.includes('spanish') || c === 'es') return { flag: '🇪🇸', label: 'Spanish', region: 'Spain & LatAm' };
  if (l.includes('chinese') || c === 'zh') return { flag: '🇨🇳', label: 'Chinese', region: 'China' };
  if (l.includes('japanese') || c === 'ja') return { flag: '🇯🇵', label: 'Japanese', region: 'Japan' };
  if (l.includes('korean') || c === 'ko') return { flag: '🇰🇷', label: 'Korean', region: 'South Korea' };
  if (l.includes('italian') || c === 'it') return { flag: '🇮🇹', label: 'Italian', region: 'Italy' };
  if (l.includes('russian') || c === 'ru') return { flag: '🇷🇺', label: 'Russian', region: 'Eastern Europe' };
  if (l.includes('portuguese') || c === 'pt') return { flag: '🇧🇷', label: 'Portuguese', region: 'Brazil & Portugal' };
  if (l.includes('british') || l.includes('uk')) return { flag: '🇬🇧', label: 'English', region: 'United Kingdom' };
  if (l.includes('irish') || l.includes('ireland')) return { flag: '🇮🇪', label: 'English', region: 'Ireland' };
  if (l.includes('australian') || l.includes('au')) return { flag: '🇦🇺', label: 'English', region: 'Australia' };
  return { flag: '🇺🇸', label: 'English', region: 'United States' };
};

// Formats raw filename or title into a clean display title and subtitle
const parseVoiceName = (rawName = '') => {
  let clean = rawName.replace(/\.wav$/i, '').trim();
  const parenMatch = clean.match(/^([^(]+)\s*\(([^)]+)\)$/);
  if (parenMatch) {
    return {
      title: parenMatch[1].trim(),
      subtitle: parenMatch[2].trim()
    };
  }
  return {
    title: clean,
    subtitle: 'Neural Studio Voice'
  };
};

export default function VoicesPage({ onNavigate, user }) {
  // Voice list states
  const [voices, setVoices] = useState([]);
  const [registry, setVoiceRegistry] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);

  // Filters and search state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedGender, setSelectedGender] = useState('all');
  const [selectedLanguage, setSelectedLanguage] = useState('all');
  const [selectedTag, setSelectedTag] = useState('all');
  const [sortBy, setSortBy] = useState('recommended');

  // Audio Playback Engine States
  const [playingVoiceId, setPlayingVoiceId] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.9);
  const [isMuted, setIsMuted] = useState(false);
  const [audioError, setAudioError] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  // Hidden Audio Player Reference
  const audioRef = useRef(null);

  // Load voices from server
  useEffect(() => {
    let isMounted = true;
    const fetchVoiceData = async () => {
      try {
        setLoading(true);
        setFetchError(null);
        const res = await axios.get(`${API_BASE}/api/voices`);
        if (!isMounted) return;

        const rawFiles = res.data?.voices || [];
        const rawRegistry = res.data?.registry || [];

        setVoices(rawFiles);
        setVoiceRegistry(rawRegistry);
      } catch (err) {
        if (!isMounted) return;
        console.warn('Voices fetch error:', err.message);
        setFetchError('Unable to load voice library. Please verify the backend service is running.');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchVoiceData();
    return () => {
      isMounted = false;
    };
  }, []);

  // Sync volume with audio element
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  // Merge raw files and rich registry metadata into uniform voice objects
  const allVoiceCards = useMemo(() => {
    if (registry && registry.length > 0) {
      return registry.map((v) => {
        const parsed = parseVoiceName(v.name || v.filename);
        const langMeta = getLanguageMeta(v.language, v.languageCode);
        return {
          id: v.filename || v.id || v.name,
          rawFilename: v.filename || `${v.name}.wav`,
          name: parsed.title,
          subtitle: parsed.subtitle,
          category: v.category || 'General',
          language: v.language || 'English (US)',
          languageCode: v.languageCode || 'en',
          gender: v.gender || 'Unknown',
          description: v.description || 'Studio-grade neural voice clone with natural cadence and realistic breath pauses.',
          tags: Array.isArray(v.tags) && v.tags.length > 0 ? v.tags : ['Neural', 'Studio'],
          previewText: v.previewText || `Hello, this is ${parsed.title}. Welcome to the future of voice cloning.`,
          flag: langMeta.flag,
          region: langMeta.region,
          isCustom: !!v.isCustom
        };
      });
    }

    // Fallback if only filenames array is available
    return voices.map((filename) => {
      const parsed = parseVoiceName(filename);
      const isUrdu = filename.toLowerCase().includes('urdu');
      const isHindi = filename.toLowerCase().includes('hindi');
      const isArabic = filename.toLowerCase().includes('arabic');
      const isFemale = filename.toLowerCase().includes('female') || 
                       filename.toLowerCase().includes('emily') || 
                       filename.toLowerCase().includes('sarah') || 
                       filename.toLowerCase().includes('fatima') || 
                       filename.toLowerCase().includes('swara');

      let lang = 'English (US)';
      let cat = 'Flagship AI';
      if (isUrdu) { lang = 'Urdu (Pakistan)'; cat = 'Urdu Master Suite'; }
      else if (isHindi) { lang = 'Hindi (India)'; cat = 'Hindi Master Suite'; }
      else if (isArabic) { lang = 'Arabic'; cat = 'Arabic Master Suite'; }

      const langMeta = getLanguageMeta(lang);

      return {
        id: filename,
        rawFilename: filename,
        name: parsed.title,
        subtitle: parsed.subtitle,
        category: cat,
        language: lang,
        languageCode: 'en',
        gender: isFemale ? 'Female' : 'Male',
        description: 'Ultra-realistic neural AI voice clone with commercial broadcast rights.',
        tags: ['Studio', 'Expressive', 'Commercial'],
        previewText: `Hello! I am ${parsed.title}. Listen to my natural pacing and clarity.`,
        flag: langMeta.flag,
        region: langMeta.region,
        isCustom: false
      };
    });
  }, [registry, voices]);

  // Extract unique filter facets
  const categoriesList = useMemo(() => {
    const set = new Set();
    allVoiceCards.forEach((v) => {
      if (v.category) set.add(v.category);
    });
    return Array.from(set).sort();
  }, [allVoiceCards]);

  const languagesList = useMemo(() => {
    const set = new Set();
    allVoiceCards.forEach((v) => {
      if (v.language) set.add(v.language);
    });
    return Array.from(set).sort();
  }, [allVoiceCards]);

  const topTags = useMemo(() => {
    const counts = {};
    allVoiceCards.forEach((v) => {
      (v.tags || []).forEach((t) => {
        counts[t] = (counts[t] || 0) + 1;
      });
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([tag]) => tag);
  }, [allVoiceCards]);

  // Filter and sort voices
  const filteredVoices = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return allVoiceCards
      .filter((voice) => {
        // 1. Text search across name, subtitle, category, language, description, tags, quote
        if (query) {
          const matchName = voice.name.toLowerCase().includes(query);
          const matchSub = voice.subtitle.toLowerCase().includes(query);
          const matchCat = voice.category.toLowerCase().includes(query);
          const matchLang = voice.language.toLowerCase().includes(query);
          const matchDesc = voice.description.toLowerCase().includes(query);
          const matchQuote = voice.previewText.toLowerCase().includes(query);
          const matchTag = voice.tags.some((t) => t.toLowerCase().includes(query));
          if (!matchName && !matchSub && !matchCat && !matchLang && !matchDesc && !matchQuote && !matchTag) {
            return false;
          }
        }

        // 2. Category filter
        if (selectedCategory !== 'all' && voice.category !== selectedCategory) {
          return false;
        }

        // 3. Gender filter
        if (selectedGender !== 'all') {
          if (voice.gender.toLowerCase() !== selectedGender.toLowerCase()) {
            return false;
          }
        }

        // 4. Language filter
        if (selectedLanguage !== 'all' && voice.language !== selectedLanguage) {
          return false;
        }

        // 5. Tag filter
        if (selectedTag !== 'all' && !voice.tags.includes(selectedTag)) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'name-asc') {
          return a.name.localeCompare(b.name);
        }
        if (sortBy === 'name-desc') {
          return b.name.localeCompare(a.name);
        }
        if (sortBy === 'language') {
          return a.language.localeCompare(b.language);
        }
        // Recommended default: Flagships first, then alphabetical
        const aFlag = a.category.toLowerCase().includes('flagship') ? -1 : 1;
        const bFlag = b.category.toLowerCase().includes('flagship') ? -1 : 1;
        if (aFlag !== bFlag) return aFlag - bFlag;
        return a.name.localeCompare(b.name);
      });
  }, [allVoiceCards, searchQuery, selectedCategory, selectedGender, selectedLanguage, selectedTag, sortBy]);

  // Active playing voice object
  const activePlayingVoice = useMemo(() => {
    return allVoiceCards.find((v) => v.id === playingVoiceId || v.rawFilename === playingVoiceId) || null;
  }, [allVoiceCards, playingVoiceId]);

  // Audio Playback Controls
  const handleTogglePlay = (voice) => {
    const targetFile = voice.rawFilename || voice.id;

    // Toggle pause/play if already selected
    if (playingVoiceId === targetFile && isPlaying) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setIsPlaying(false);
      return;
    }

    if (playingVoiceId === targetFile && !isPlaying) {
      if (audioRef.current) {
        audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
      }
      return;
    }

    // Switch to new voice
    setPlayingVoiceId(targetFile);
    setIsPlaying(true);
    setAudioError(null);
    setCurrentTime(0);

    if (audioRef.current) {
      const src = `${API_BASE}/voices/${encodeURIComponent(targetFile)}`;
      audioRef.current.src = src;
      audioRef.current.load();
      audioRef.current.play().catch((err) => {
        console.warn('Playback error for voice:', targetFile, err);
        setAudioError('Preview audio unavailable on this device or port.');
        setIsPlaying(false);
      });
    }
  };

  const handleStopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsPlaying(false);
    setPlayingVoiceId(null);
    setCurrentTime(0);
  };

  const handleSeek = (e) => {
    const newTime = parseFloat(e.target.value);
    setCurrentTime(newTime);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
  };

  // Direct action: Transfer to Studio
  const handleUseInStudio = (voice) => {
    try {
      const payload = {
        voice: voice.rawFilename,
        text: voice.previewText || `Hello, this is ${voice.name}. Let's create something extraordinary with SK - VoiceClone Studio.`
      };
      localStorage.setItem('sk_voiceclone_preload_script', JSON.stringify(payload));
    } catch (e) {
      console.warn('Failed to save preload script:', e);
    }
    onNavigate('studio');
  };

  // Copy voice name / share
  const handleCopyVoice = (voice) => {
    navigator.clipboard?.writeText(voice.rawFilename || voice.name);
    setCopiedId(voice.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Reset all filters
  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('all');
    setSelectedGender('all');
    setSelectedLanguage('all');
    setSelectedTag('all');
    setSortBy('recommended');
  };

  const isFiltered = searchQuery !== '' || 
    selectedCategory !== 'all' || 
    selectedGender !== 'all' || 
    selectedLanguage !== 'all' || 
    selectedTag !== 'all';

  // Format time in seconds to M:SS
  const formatTime = (secs) => {
    if (isNaN(secs) || secs < 0) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="min-h-screen text-zinc-900 pb-32">
      {/* Hidden Master Audio Element */}
      <audio
        ref={audioRef}
        crossOrigin="anonymous"
        preload="auto"
        onTimeUpdate={() => {
          if (audioRef.current) {
            setCurrentTime(audioRef.current.currentTime || 0);
          }
        }}
        onLoadedMetadata={() => {
          if (audioRef.current) {
            setDuration(audioRef.current.duration || 0);
          }
        }}
        onEnded={() => {
          setIsPlaying(false);
          setCurrentTime(0);
        }}
        onPause={() => setIsPlaying(false)}
        onPlay={() => setIsPlaying(true)}
        onError={() => {
          setIsPlaying(false);
          setAudioError('Failed to stream voice sample.');
        }}
      />

      {/* ========================================================================= */}
      {/* 1. HERO & CATALOG HEADER                                                  */}
      {/* ========================================================================= */}
      <section className="relative pt-10 pb-12 sm:pt-14 sm:pb-16 px-4 sm:px-6 lg:px-8 border-b border-zinc-200/80 bg-white">
        {/* Subtle decorative glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[260px] bg-indigo-50/70 rounded-full blur-3xl pointer-events-none"></div>

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-3 max-w-3xl">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/80 shadow-xs">
                <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse"></span>
                <span>120+ Neural Voice Directory</span>
                <span className="text-zinc-300">•</span>
                <span className="text-zinc-600 font-medium">35+ Regional Accents</span>
              </div>

              <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-zinc-900 leading-tight">
                Studio Voice Catalog & <span className="bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 bg-clip-text text-transparent">Audition Deck</span>
              </h1>

              <p className="text-sm sm:text-base text-zinc-600 leading-relaxed max-w-2xl font-normal">
                Audition every reference voice clone in real-time. Listen to authentic human cadence, breath inflections, and emotional depth. When you find the voice that fits your brand, load it instantly into the Studio workstation.
              </p>
            </div>

            {/* Quick Metrics Strip */}
            <div className="flex items-center gap-3 sm:gap-4 shrink-0 bg-zinc-50 border border-zinc-200/90 rounded-2xl p-3 sm:p-4 shadow-xs">
              <div className="text-center px-2">
                <div className="text-xl sm:text-2xl font-extrabold text-zinc-900">
                  {loading ? '...' : allVoiceCards.length}
                </div>
                <div className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Voices</div>
              </div>
              <div className="h-8 w-px bg-zinc-200"></div>
              <div className="text-center px-2">
                <div className="text-xl sm:text-2xl font-extrabold text-indigo-600">35+</div>
                <div className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Languages</div>
              </div>
              <div className="h-8 w-px bg-zinc-200"></div>
              <div className="text-center px-2">
                <div className="text-xl sm:text-2xl font-extrabold text-zinc-900">100%</div>
                <div className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Commercial</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 2. SEARCH & CONTROL BAR (STICKY OR PROMINENT)                             */}
      {/* ========================================================================= */}
      <section className="sticky top-[61px] z-30 bg-white/95 backdrop-blur-xl border-b border-zinc-200 shadow-xs py-4 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-3.5">
          {/* Top Row: Search Input + Gender Selector + Language Selector + Sort Dropdown */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by voice name, dialect, tag (e.g. Adam, Urdu, Deep, Storyteller, Audiobook)..."
                className="w-full pl-10 pr-9 py-2.5 rounded-xl border border-zinc-300 text-sm bg-white text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all shadow-xs"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-zinc-400 hover:text-zinc-600"
                  title="Clear search"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            {/* Gender Filter Segmented Tabs */}
            <div className="flex items-center bg-zinc-100 p-1 rounded-xl border border-zinc-200/80 shrink-0">
              <button
                onClick={() => setSelectedGender('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  selectedGender === 'all'
                    ? 'bg-white text-zinc-900 shadow-xs'
                    : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                All Genders
              </button>
              <button
                onClick={() => setSelectedGender('Male')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                  selectedGender === 'Male'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                <span>♂</span> Male
              </button>
              <button
                onClick={() => setSelectedGender('Female')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                  selectedGender === 'Female'
                    ? 'bg-white text-rose-700 shadow-xs'
                    : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                <span>♀</span> Female
              </button>
            </div>

            {/* Language Dropdown */}
            <select
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              className="py-2.5 px-3 rounded-xl border border-zinc-300 text-xs font-semibold bg-white text-zinc-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shrink-0 cursor-pointer shadow-xs"
            >
              <option value="all">🌐 All Languages ({languagesList.length})</option>
              {languagesList.map((lang) => (
                <option key={lang} value={lang}>
                  {lang}
                </option>
              ))}
            </select>

            {/* Sort Dropdown */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="py-2.5 px-3 rounded-xl border border-zinc-300 text-xs font-semibold bg-white text-zinc-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shrink-0 cursor-pointer shadow-xs"
            >
              <option value="recommended">⭐ Recommended (Flagship)</option>
              <option value="name-asc">Alphabetical (A - Z)</option>
              <option value="name-desc">Alphabetical (Z - A)</option>
              <option value="language">Sort by Language</option>
            </select>

            {/* Clear All Filters Button */}
            {isFiltered && (
              <button
                onClick={handleResetFilters}
                className="py-2.5 px-3 rounded-xl border border-rose-200 text-xs font-bold bg-rose-50 text-rose-700 hover:bg-rose-100 transition-colors shrink-0 flex items-center gap-1.5"
                title="Reset all search filters"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>Reset</span>
              </button>
            )}
          </div>

          {/* Bottom Row: Category Filter Pill Carousel */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none pt-0.5">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
                selectedCategory === 'all'
                  ? 'bg-zinc-900 text-white shadow-xs'
                  : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200/80 hover:text-zinc-900'
              }`}
            >
              All Categories ({allVoiceCards.length})
            </button>
            {categoriesList.map((cat) => {
              const isActive = selectedCategory === cat;
              const count = allVoiceCards.filter((v) => v.category === cat).length;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-indigo-600 text-white font-bold shadow-xs'
                      : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200/80 hover:text-zinc-900'
                  }`}
                >
                  <span>{cat}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isActive ? 'bg-indigo-700/80 text-white' : 'bg-zinc-200 text-zinc-600'}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Active Tags Strip */}
          {topTags.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap pt-0.5 text-xs text-zinc-500">
              <span className="font-semibold text-zinc-400 mr-1">Archetypes:</span>
              {topTags.map((t) => {
                const isSelected = selectedTag === t;
                return (
                  <button
                    key={t}
                    onClick={() => setSelectedTag(isSelected ? 'all' : t)}
                    className={`px-2.5 py-0.5 rounded-md text-[11px] font-medium transition-all ${
                      isSelected
                        ? 'bg-indigo-100 text-indigo-800 border border-indigo-300 font-bold'
                        : 'bg-zinc-50 text-zinc-600 border border-zinc-200 hover:bg-zinc-100 hover:text-zinc-900'
                    }`}
                  >
                    #{t}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 3. VOICES CARD GRID SECTION                                               */}
      {/* ========================================================================= */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {/* Results summary bar */}
        <div className="flex items-center justify-between pb-6 border-b border-zinc-200/80">
          <div className="text-xs sm:text-sm font-semibold text-zinc-600">
            Showing <span className="font-bold text-zinc-900">{filteredVoices.length}</span> of {allVoiceCards.length} neural voices
            {selectedCategory !== 'all' && <span className="text-indigo-600"> in {selectedCategory}</span>}
          </div>

          {audioError && (
            <div className="text-xs font-semibold text-rose-600 bg-rose-50 px-3 py-1 rounded-lg border border-rose-200">
              {audioError}
            </div>
          )}
        </div>

        {/* Loading Spinner */}
        {loading && (
          <div className="py-24 text-center space-y-4">
            <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-sm font-semibold text-zinc-600">Loading neural voice library...</p>
          </div>
        )}

        {/* Server Fetch Error */}
        {!loading && fetchError && (
          <div className="my-12 p-6 rounded-2xl bg-rose-50 border border-rose-200 text-center max-w-lg mx-auto space-y-3">
            <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto font-bold text-lg">!</div>
            <h3 className="text-base font-bold text-rose-900">{fetchError}</h3>
            <p className="text-xs text-rose-700 leading-relaxed">
              Ensure the backend engine is running on port 5000 (`node server.js`).
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-rose-600 text-white text-xs font-bold rounded-xl shadow-xs hover:bg-rose-700 transition-colors"
            >
              Retry Connection
            </button>
          </div>
        )}

        {/* Empty Search Results State */}
        {!loading && !fetchError && filteredVoices.length === 0 && (
          <div className="py-20 text-center max-w-md mx-auto space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-zinc-100 text-zinc-400 flex items-center justify-center mx-auto">
              <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 100-6 3 3 0 000 6z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-zinc-900">No voices match your search</h3>
            <p className="text-xs text-zinc-500 leading-relaxed">
              We couldn't find any voices matching "{searchQuery}". Try selecting another category or resetting your active filters.
            </p>
            <button
              onClick={handleResetFilters}
              className="px-5 py-2.5 rounded-xl bg-zinc-900 text-white text-xs font-bold shadow-sm hover:bg-zinc-800 transition-colors"
            >
              Reset All Filters
            </button>
          </div>
        )}

        {/* The Card Grid */}
        {!loading && !fetchError && filteredVoices.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 pt-6">
            {filteredVoices.map((voice) => {
              const isCardPlaying = (playingVoiceId === voice.rawFilename || playingVoiceId === voice.id) && isPlaying;
              const isFemale = voice.gender.toLowerCase() === 'female';

              return (
                <div
                  key={voice.id}
                  className={`bg-white rounded-2xl border transition-all duration-300 flex flex-col justify-between overflow-hidden relative group ${
                    isCardPlaying
                      ? 'border-indigo-500 ring-2 ring-indigo-500/20 shadow-lg shadow-indigo-500/5'
                      : 'border-zinc-200/90 hover:border-indigo-300 hover:shadow-md'
                  }`}
                >
                  {/* Top Card Body */}
                  <div className="p-5 space-y-4">
                    {/* Header: Avatar, Name, Flags, Gender */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        {/* Speaker Avatar with Gender-Tailored Gradient */}
                        <div
                          className={`w-11 h-11 rounded-xl flex items-center justify-center font-black text-sm text-white shrink-0 shadow-sm ${
                            isFemale
                              ? 'bg-gradient-to-tr from-rose-500 via-pink-500 to-violet-500 shadow-rose-500/20'
                              : 'bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-600 shadow-indigo-500/20'
                          }`}
                        >
                          {voice.name.substring(0, 2).toUpperCase()}
                        </div>

                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h3 className="text-base font-bold text-zinc-900 leading-tight">
                              {voice.name}
                            </h3>
                            {voice.isCustom && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                                Custom
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-zinc-500 font-medium truncate max-w-[210px] mt-0.5">
                            {voice.subtitle}
                          </p>
                        </div>
                      </div>

                      {/* Right Badges: Flag & Gender */}
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span
                          className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-700 border border-zinc-200/80"
                          title={`${voice.language} (${voice.region})`}
                        >
                          <span>{voice.flag}</span>
                          <span className="hidden sm:inline">{voice.language.split(' ')[0]}</span>
                        </span>
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            isFemale ? 'bg-rose-50 text-rose-700' : 'bg-indigo-50 text-indigo-700'
                          }`}
                        >
                          {isFemale ? '♀ Female' : '♂ Male'}
                        </span>
                      </div>
                    </div>

                    {/* Category Pill + Tags */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100">
                        {voice.category}
                      </span>
                      {voice.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-zinc-50 text-zinc-600 border border-zinc-200/70"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>

                    {/* Description Text */}
                    <p className="text-xs text-zinc-600 leading-relaxed font-normal line-clamp-2">
                      {voice.description}
                    </p>

                    {/* Sample Quote Preview Bubble */}
                    <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200/70 text-xs text-zinc-700 italic relative">
                      <div className="text-zinc-400 absolute top-2 left-2 text-sm leading-none font-serif select-none">“</div>
                      <p className="pl-3.5 pr-1 line-clamp-3 leading-relaxed font-normal">
                        {voice.previewText}
                      </p>
                    </div>
                  </div>

                  {/* Audio Audition Section & Equalizer */}
                  <div className="px-5 pb-5 pt-1 space-y-3">
                    {/* Audio Controller Bar */}
                    <div className="p-3 rounded-xl bg-zinc-50/90 border border-zinc-200/90 flex items-center justify-between gap-3">
                      {/* Play/Pause Button */}
                      <button
                        onClick={() => handleTogglePlay(voice)}
                        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all shadow-xs ${
                          isCardPlaying
                            ? 'bg-indigo-600 text-white shadow-indigo-500/25 animate-pulse'
                            : 'bg-zinc-900 hover:bg-zinc-800 text-white'
                        }`}
                        title={isCardPlaying ? 'Pause preview' : 'Audition voice sample'}
                      >
                        {isCardPlaying ? (
                          <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                            <rect x="6" y="5" width="4" height="14" rx="1.5" />
                            <rect x="14" y="5" width="4" height="14" rx="1.5" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4 fill-current ml-0.5" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z" />
                          </svg>
                        )}
                      </button>

                      {/* Animated Soundwave Equalizer Bars */}
                      <div className="flex-1 flex items-center justify-center gap-1 h-8 px-2 overflow-hidden">
                        {[40, 75, 55, 90, 60, 100, 70, 85, 45, 95, 65, 80, 50, 90].map((baseHeight, idx) => {
                          const barHeight = isCardPlaying
                            ? Math.max(20, Math.min(100, (baseHeight + ((idx % 3) * 15))))
                            : 20;

                          return (
                            <span
                              key={idx}
                              style={{
                                height: `${barHeight}%`,
                                transition: 'height 0.25s ease'
                              }}
                              className={`w-1 rounded-full ${
                                isCardPlaying
                                  ? 'bg-gradient-to-t from-indigo-600 to-violet-500 animate-pulse'
                                  : 'bg-zinc-300'
                              }`}
                            ></span>
                          );
                        })}
                      </div>

                      {/* Audio status / timestamp */}
                      <div className="text-[11px] font-mono font-semibold text-zinc-500 shrink-0 text-right">
                        {isCardPlaying ? formatTime(currentTime) : 'Preview'}
                      </div>
                    </div>

                    {/* Card Actions Footer: "Use in Studio" + Download/Copy */}
                    <div className="flex items-center gap-2 pt-1">
                      {/* Primary "Use in Studio" CTA */}
                      <button
                        onClick={() => handleUseInStudio(voice)}
                        className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-zinc-900 hover:bg-zinc-800 transition-all flex items-center justify-center gap-2 shadow-xs group/btn active:scale-[0.98]"
                        title="Load this voice directly into the Speech Studio"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                        </svg>
                        <span>Use in Studio</span>
                        <svg className="w-3 h-3 transition-transform group-hover/btn:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                      </button>

                      {/* Download Reference Sample Button */}
                      <a
                        href={`${API_BASE}/voices/${encodeURIComponent(voice.rawFilename)}`}
                        download={voice.rawFilename}
                        className="p-2.5 rounded-xl border border-zinc-200/90 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 transition-colors shrink-0"
                        title="Download .wav audio reference file"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                      </a>

                      {/* Copy Reference Name Button */}
                      <button
                        onClick={() => handleCopyVoice(voice)}
                        className="p-2.5 rounded-xl border border-zinc-200/90 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 transition-colors shrink-0 relative"
                        title="Copy reference voice name"
                      >
                        {copiedId === voice.id ? (
                          <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* ========================================================================= */}
      {/* 4. FLOATING STICKY AUDITION PLAYER DOCK                                   */}
      {/* ========================================================================= */}
      {activePlayingVoice && (
        <div className="fixed bottom-4 left-4 right-4 max-w-4xl mx-auto z-40 bg-zinc-900/95 backdrop-blur-xl text-white rounded-2xl border border-zinc-700/80 shadow-2xl p-3 sm:p-4 animate-fadeIn">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            {/* Left: Active Voice Info */}
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-violet-500 flex items-center justify-center font-bold text-sm text-white shrink-0 shadow-md">
                {activePlayingVoice.name.substring(0, 2).toUpperCase()}
              </div>

              <div className="truncate flex-1 sm:max-w-[180px]">
                <div className="flex items-center gap-1.5">
                  <h4 className="text-sm font-bold text-white truncate leading-tight">
                    {activePlayingVoice.name}
                  </h4>
                  <span className="text-xs">{activePlayingVoice.flag}</span>
                </div>
                <p className="text-[11px] text-zinc-400 truncate">
                  {activePlayingVoice.subtitle}
                </p>
              </div>

              {/* Mobile Play / Pause */}
              <button
                onClick={() => handleTogglePlay(activePlayingVoice)}
                className="sm:hidden w-9 h-9 rounded-xl bg-white text-zinc-900 flex items-center justify-center shrink-0 ml-auto"
              >
                {isPlaying ? (
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <rect x="6" y="5" width="4" height="14" rx="1.5" />
                    <rect x="14" y="5" width="4" height="14" rx="1.5" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4 fill-current ml-0.5" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                )}
              </button>
            </div>

            {/* Center: Play/Pause + Timeline Scrubber */}
            <div className="w-full sm:flex-1 flex items-center gap-3 px-2">
              <button
                onClick={() => handleTogglePlay(activePlayingVoice)}
                className="hidden sm:flex w-9 h-9 rounded-xl bg-white text-zinc-900 hover:bg-zinc-200 items-center justify-center shrink-0 transition-colors"
                title={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? (
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <rect x="6" y="5" width="4" height="14" rx="1.5" />
                    <rect x="14" y="5" width="4" height="14" rx="1.5" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4 fill-current ml-0.5" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                )}
              </button>

              <span className="text-[11px] font-mono text-zinc-400 shrink-0 w-9 text-right">
                {formatTime(currentTime)}
              </span>

              {/* Progress Slider */}
              <input
                type="range"
                min="0"
                max={duration || 10}
                step="0.05"
                value={currentTime}
                onChange={handleSeek}
                className="w-full h-1.5 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />

              <span className="text-[11px] font-mono text-zinc-400 shrink-0 w-9">
                {formatTime(duration)}
              </span>
            </div>

            {/* Right: Volume & Studio CTA & Close */}
            <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
              {/* Volume Button */}
              <button
                onClick={() => setIsMuted(!isMuted)}
                className="p-2 text-zinc-400 hover:text-white transition-colors"
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted || volume === 0 ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  </svg>
                )}
              </button>

              {/* Volume Slider (hidden on tiny screens) */}
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={(e) => {
                  setVolume(parseFloat(e.target.value));
                  setIsMuted(false);
                }}
                className="w-16 h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-indigo-500 hidden md:inline-block"
              />

              {/* "Use in Studio" Button */}
              <button
                onClick={() => handleUseInStudio(activePlayingVoice)}
                className="py-1.5 px-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
              >
                <span>Use Voice</span>
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>

              {/* Close / Stop Button */}
              <button
                onClick={handleStopAudio}
                className="p-1.5 text-zinc-400 hover:text-white transition-colors"
                title="Close audition player"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
