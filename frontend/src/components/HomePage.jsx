import React, { useState, useRef } from 'react';

const API_BASE = typeof window !== 'undefined' && window.location.port === '5173' ? 'http://localhost:5000' : '';

export default function HomePage({
  onNavigate,
  user
}) {
  // Demo voice preview state for Hero
  const [activeDemoVoice, setActiveDemoVoice] = useState('Adam (Deep Narration - ElevenLabs Style).wav');
  const [isPlayingDemo, setIsPlayingDemo] = useState(false);
  const audioPlayerRef = useRef(null);

  // Curated demo voices with direct file mapping and descriptive previews
  const heroDemoVoices = [
    {
      id: 'Adam (Deep Narration - ElevenLabs Style).wav',
      name: 'Adam',
      role: 'Deep Narration • ElevenLabs Style',
      flag: 'US',
      sampleText: 'Welcome to the future of neural speech. In this universe, your voice carries infinite possibilities.',
      accent: 'American English',
      tag: 'Flagship'
    },
    {
      id: 'Emily (Irish Melodic & Warm).wav',
      name: 'Emily',
      role: 'Warm Melodic • Storyteller',
      flag: 'IE',
      sampleText: 'Listen closely to the wind across the emerald hills, carrying stories whispered through time.',
      accent: 'Irish English',
      tag: 'Popular'
    },
    {
      id: 'Asad (Urdu - Deep Classical Narration).wav',
      name: 'Asad',
      role: 'Deep Classical Oratory • اردو',
      flag: 'PK',
      sampleText: 'زندگی کے راستے پر خوابوں کی تلاش میں چلتے ہوئے ہم اپنی منزل پا ہی لیتے ہیں۔',
      accent: 'Urdu (Pakistan)',
      tag: 'Classical'
    },
    {
      id: 'Swara (Hindi - Conversational & Podcast Host).wav',
      name: 'Swara',
      role: 'Conversational Host • हिन्दी',
      flag: 'IN',
      sampleText: 'आज की इस कहानी में हम जानेंगे कि कैसे तकनीक हमारी दुनिया को नई उड़ान दे रही है।',
      accent: 'Hindi (India)',
      tag: 'Expressive'
    }
  ];

  const handleToggleDemoPlay = (voiceFile) => {
    if (activeDemoVoice === voiceFile && isPlayingDemo) {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
      }
      setIsPlayingDemo(false);
      return;
    }

    setActiveDemoVoice(voiceFile);
    setIsPlayingDemo(true);

    if (audioPlayerRef.current) {
      const audioSrc = `${API_BASE}/voices/${encodeURIComponent(voiceFile)}`;
      audioPlayerRef.current.src = audioSrc;
      audioPlayerRef.current.load();
      audioPlayerRef.current.play().catch((err) => {
        console.warn('Audio demo preview play error:', err);
        setIsPlayingDemo(false);
      });
    }
  };

  return (
    <div className="text-zinc-900 overflow-x-clip">
      {/* Hidden audio element for hero demos */}
      <audio
        ref={audioPlayerRef}
        crossOrigin="anonymous"
        preload="auto"
        onEnded={() => setIsPlayingDemo(false)}
        onPause={() => setIsPlayingDemo(false)}
        onPlay={() => setIsPlayingDemo(true)}
        onError={(e) => {
          console.error('Audio preview playback error:', e);
          setIsPlayingDemo(false);
        }}
      />

      {/* ========================================================================= */}
      {/* 1. HERO SECTION                                                          */}
      {/* ========================================================================= */}
      <section className="relative pt-12 pb-20 md:pt-20 md:pb-28 px-4 sm:px-6 lg:px-8 overflow-hidden">
        {/* Ambient background glows */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] sm:w-[1000px] h-[380px] bg-indigo-100/60 rounded-full blur-[140px] pointer-events-none"></div>
        <div className="absolute top-1/3 left-1/4 w-[400px] h-[300px] bg-violet-100/50 rounded-full blur-[120px] pointer-events-none"></div>

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center max-w-4xl mx-auto">
            {/* Main Headline matching Image 2 */}
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-zinc-950 leading-[1.12]">
              Transform Words into<br />
              <span className="text-zinc-950">Studio-Grade Human Voices</span>
            </h1>

            {/* Subtitle matching Image 2 */}
            <p className="mt-5 text-base sm:text-lg leading-relaxed max-w-2xl mx-auto font-normal text-zinc-600">
              Create realistic voiceovers, clones, and dubbing with hyper-realistic AI that sounds completely human.
            </p>

            {/* CTA Buttons Group matching Image 2 */}
            <div className="mt-8 flex items-center justify-center gap-3.5">
              <button
                type="button"
                onClick={() => onNavigate('studio')}
                className="px-7 py-3.5 rounded-xl text-sm font-bold bg-[#1e1b4b] hover:bg-black text-white shadow-lg shadow-indigo-950/20 transition-all transform hover:-translate-y-0.5 active:scale-95 cursor-pointer"
              >
                Generate Now
              </button>

              <button
                type="button"
                onClick={() => onNavigate('voices')}
                className="px-6 py-3.5 rounded-xl text-sm font-semibold border border-zinc-200/90 bg-white hover:bg-zinc-50 text-zinc-800 shadow-2xs transition-all active:scale-95 cursor-pointer"
              >
                Try for Free
              </button>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* HERO OVERLAPPING SOUNDWAVE SHOWCASE DECK (Matching Image 2)              */}
          {/* ========================================================================= */}
          <div className="mt-14 max-w-2xl mx-auto relative px-4">
            {/* Flanking Preview Card - Left (Peeking from behind) */}
            <div className="hidden lg:flex items-center justify-between p-4 rounded-2xl bg-white border border-zinc-200/80 shadow-lg absolute -left-16 top-10 w-72 transform -rotate-3 opacity-70 pointer-events-none z-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-rose-500 to-violet-500 flex items-center justify-center text-white text-xs font-bold shadow-xs">
                  SJ
                </div>
                <div>
                  <h4 className="text-xs font-bold text-zinc-800 leading-tight">Sarah J.</h4>
                  <p className="text-[10px] text-zinc-400">🇺🇸 English (US)</p>
                </div>
              </div>
              <div className="w-24 h-6 flex items-center gap-1">
                {[40, 70, 30, 90, 60, 40, 80, 50, 90, 35].map((h, i) => (
                  <span key={i} style={{ height: `${h}%` }} className="w-1 bg-violet-400 rounded-full"></span>
                ))}
              </div>
            </div>

            {/* Flanking Preview Card - Right (Peeking from behind) */}
            <div className="hidden lg:flex items-center justify-between p-4 rounded-2xl bg-white border border-zinc-200/80 shadow-lg absolute -right-16 top-10 w-72 transform rotate-3 opacity-70 pointer-events-none z-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-violet-500 flex items-center justify-center text-white text-xs font-bold shadow-xs">
                  MR
                </div>
                <div>
                  <h4 className="text-xs font-bold text-zinc-800 leading-tight">Matar R.</h4>
                  <p className="text-[10px] text-zinc-400">🇮🇹 English (US)</p>
                </div>
              </div>
              <div className="w-24 h-6 flex items-center gap-1">
                {[50, 35, 80, 45, 90, 65, 30, 85, 40, 75].map((h, i) => (
                  <span key={i} style={{ height: `${h}%` }} className="w-1 bg-violet-400 rounded-full"></span>
                ))}
              </div>
            </div>

            {/* Center Elevated Master Card (Matching Image 2) */}
            <div className="relative z-10 bg-white rounded-3xl border border-zinc-200/90 shadow-2xl p-6 sm:p-7 space-y-5">
              {/* Top Speaker: Adam (Matches playing voice: Adam Deep Narration) */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-violet-600 via-indigo-600 to-blue-600 text-white font-extrabold text-sm flex items-center justify-center shrink-0 shadow-sm ring-2 ring-violet-500/20">
                    AD
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-sm font-bold text-zinc-900 leading-tight">Adam</h4>
                      <span className="text-xs">🇺🇸</span>
                      <span className="text-xs text-zinc-500 font-medium">English (US)</span>
                    </div>
                    <p className="text-[11px] text-zinc-400">Deep Narration • ElevenLabs Style</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    try {
                      localStorage.setItem('sk_voiceclone_selected_voice', 'Adam (Deep Narration - ElevenLabs Style).wav');
                    } catch (e) { }
                    onNavigate('studio');
                  }}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-violet-50 hover:bg-violet-100 text-violet-700 border border-violet-100 transition-colors shadow-2xs cursor-pointer active:scale-95"
                >
                  Use Voice →
                </button>
              </div>

              {/* Central Fluid Soundwave Graphic with Center Play Button */}
              <div className="relative h-20 sm:h-24 rounded-2xl bg-gradient-to-r from-violet-50 via-purple-50/80 to-indigo-50 flex items-center justify-center px-4 overflow-hidden border border-violet-100/80 group">
                {/* Continuous Violet Smooth Soundwave Waves */}
                <div className="absolute inset-0 flex items-center justify-center gap-1 px-4">
                  {[25, 45, 60, 40, 80, 55, 95, 65, 100, 70, 85, 40, 60, 30, 85, 55, 95, 75, 50, 90, 65, 45, 80, 35, 70, 50, 85, 60, 40, 75, 50, 30].map((h, i) => (
                    <span
                      key={i}
                      style={{
                        height: isPlayingDemo ? `${h}%` : '20%',
                        transition: 'height 0.2s ease'
                      }}
                      className={`w-1 sm:w-1.5 rounded-full ${isPlayingDemo
                          ? 'bg-gradient-to-t from-violet-600 via-purple-500 to-indigo-500 animate-pulse'
                          : 'bg-violet-300/80'
                        }`}
                    ></span>
                  ))}
                </div>

                {/* Center Circular Play / Pause Button */}
                <button
                  type="button"
                  onClick={() => handleToggleDemoPlay(activeDemoVoice)}
                  className="relative z-10 w-12 h-12 rounded-full bg-violet-600 hover:bg-violet-700 text-white flex items-center justify-center shadow-lg shadow-violet-500/35 transition-transform active:scale-95 cursor-pointer"
                  title={isPlayingDemo ? 'Pause' : 'Play preview'}
                >
                  {isPlayingDemo ? (
                    <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                      <rect x="6" y="4" width="4" height="16" rx="1.5" />
                      <rect x="14" y="4" width="4" height="16" rx="1.5" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 fill-current ml-0.5" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  )}
                </button>
              </div>

              {/* Bottom Speaker: Suian G. */}
              <div className="flex items-center justify-between pt-2 border-t border-zinc-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-600 text-white font-bold text-sm flex items-center justify-center shrink-0 shadow-sm ring-2 ring-violet-500/20">
                    SG
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-sm font-bold text-zinc-900 leading-tight">Suian G.</h4>
                      <span className="text-xs">🇺🇸</span>
                      <span className="text-xs text-zinc-500 font-medium">English (US)</span>
                    </div>
                    <p className="text-[11px] text-zinc-400">Conversational Tech Specialist</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onNavigate('voices')}
                  className="text-xs font-semibold text-violet-600 hover:text-violet-800 transition-colors flex items-center gap-1"
                >
                  <span>120+ voices catalog</span>
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* Glowing Frosted Metrics Ribbon (Matching Image 2) */}
          <div className="mt-8 sm:mt-10 text-center relative z-10 px-4">
            <div className="inline-flex items-center flex-wrap justify-center gap-3 sm:gap-6 md:gap-8 px-5 sm:px-8 py-3 rounded-full bg-white/95 border border-violet-100 shadow-xl shadow-violet-500/10 backdrop-blur-md text-xs sm:text-sm font-medium text-zinc-700">
              <div className="flex items-center gap-1.5">
                <strong className="text-zinc-900 font-extrabold">10M+</strong> characters generated
              </div>
              <div className="hidden sm:inline text-zinc-300">•</div>
              <div className="flex items-center gap-1.5">
                <strong className="text-zinc-900 font-extrabold">99.8%</strong> human parity
              </div>
              <div className="hidden sm:inline text-zinc-300">•</div>
              <div className="flex items-center gap-1.5">
                <strong className="text-zinc-900 font-extrabold">50K+</strong> developers &amp; creators
              </div>
            </div>
          </div>

          {/* 3 Step Workflow Cards (Matching Image 2 Bottom Layout) */}
          <div className="mt-12 sm:mt-16 max-w-5xl lg:max-w-6xl mx-auto relative z-10 px-4 sm:px-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 lg:gap-6 text-left items-stretch">
              {/* Step 1: Input Text & Select Voice */}
              <div className="p-5 sm:p-6 lg:p-7 rounded-3xl bg-white border border-zinc-200/90 shadow-md hover:shadow-lg transition-all flex flex-col h-full group">
                <div className="flex items-center gap-3 mb-4 sm:mb-5 min-h-[44px]">
                  <span className="w-8 h-8 rounded-xl bg-violet-100 text-violet-700 font-extrabold text-xs flex items-center justify-center shrink-0 shadow-2xs">
                    1
                  </span>
                  <h3 className="text-base font-bold text-zinc-900 tracking-tight leading-snug">
                    Input Text &amp; Select Voice
                  </h3>
                </div>

                {/* Visual Mockup inside Card 1 */}
                <div className="flex-1 p-4 rounded-2xl bg-slate-50/90 border border-zinc-200/80 flex flex-col justify-between gap-3 min-h-[200px]">
                  <div className="flex items-center justify-between text-[11px] text-zinc-500 font-medium">
                    <span className="flex items-center gap-1.5 font-semibold text-zinc-700">
                      <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span>Script Editor</span>
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-violet-100 text-violet-700 text-[10px] font-mono font-bold">
                      &lt;prompt&gt;
                    </span>
                  </div>

                  <div className="text-xs text-zinc-700 font-mono bg-white p-3 rounded-xl border border-zinc-200/80 leading-relaxed shadow-2xs line-clamp-2">
                    "Transform words into studio-grade human voices with hyper-realistic AI..."
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-zinc-500 pt-2 border-t border-zinc-200/60">
                    <span className="font-medium text-zinc-700 flex items-center gap-1">
                      <span>🇺🇸</span> Sarah (US)
                    </span>
                    <span className="font-mono font-semibold text-zinc-600">68 chars</span>
                  </div>
                </div>
              </div>

              {/* Step 2: Generate & Refine */}
              <div className="p-5 sm:p-6 lg:p-7 rounded-3xl bg-white border border-zinc-200/90 shadow-md hover:shadow-lg transition-all flex flex-col h-full group">
                <div className="flex items-center gap-3 mb-4 sm:mb-5 min-h-[44px]">
                  <span className="w-8 h-8 rounded-xl bg-violet-100 text-violet-700 font-extrabold text-xs flex items-center justify-center shrink-0 shadow-2xs">
                    2
                  </span>
                  <h3 className="text-base font-bold text-zinc-900 tracking-tight leading-snug">
                    Generate &amp; Refine
                  </h3>
                </div>

                {/* Visual Mockup inside Card 2 */}
                <div className="flex-1 p-4 rounded-2xl bg-slate-50/90 border border-zinc-200/80 flex flex-col justify-between gap-3 min-h-[200px]">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {/* Radial Progress Gauge */}
                      <div className="relative w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center shrink-0">
                        <svg className="w-9 h-9 sm:w-10 sm:h-10 transform -rotate-90" viewBox="0 0 36 36">
                          <path className="text-zinc-200" strokeWidth="3.5" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                          <path className="text-violet-600" strokeDasharray="92, 100" strokeLinecap="round" strokeWidth="3.5" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                        </svg>
                        <span className="absolute text-[10px] font-bold font-mono text-zinc-800">92%</span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-zinc-900 truncate">Neural Synthesis</p>
                        <p className="text-[10px] text-zinc-500 font-medium truncate">XTTS-v2 Engine</p>
                      </div>
                    </div>
                    <span className="shrink-0 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                      Processing
                    </span>
                  </div>

                  {/* Sliders */}
                  <div className="space-y-1.5 bg-white p-2.5 rounded-xl border border-zinc-200/80 shadow-2xs">
                    <div className="flex items-center justify-between text-[11px] text-zinc-600">
                      <span>Pacing / Speed</span>
                      <span className="font-mono font-bold text-zinc-900">1.05x</span>
                    </div>
                    <div className="w-full h-1.5 bg-zinc-200 rounded-full relative">
                      <div className="w-[60%] h-full bg-violet-600 rounded-full"></div>
                      <div className="absolute top-1/2 left-[60%] -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-violet-600 border-2 border-white shadow-xs"></div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-zinc-500 pt-2 border-t border-zinc-200/60">
                    <span>Pitch: Natural</span>
                    <span className="font-semibold text-violet-700">Studio Warm</span>
                  </div>
                </div>
              </div>

              {/* Step 3: Download & Integrate */}
              <div className="p-5 sm:p-6 lg:p-7 rounded-3xl bg-white border border-zinc-200/90 shadow-md hover:shadow-lg transition-all flex flex-col h-full group">
                <div className="flex items-center gap-3 mb-4 sm:mb-5 min-h-[44px]">
                  <span className="w-8 h-8 rounded-xl bg-violet-100 text-violet-700 font-extrabold text-xs flex items-center justify-center shrink-0 shadow-2xs">
                    3
                  </span>
                  <h3 className="text-base font-bold text-zinc-900 tracking-tight leading-snug">
                    Download &amp; Integrate
                  </h3>
                </div>

                {/* Visual Mockup inside Card 3 */}
                <div className="flex-1 p-4 rounded-2xl bg-slate-50/90 border border-zinc-200/80 flex flex-col justify-between gap-3 min-h-[200px]">
                  {/* Top file row */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-violet-100 text-violet-600 flex items-center justify-center shrink-0 shadow-2xs">
                        <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 00-9.78 2.096A4.001 4.001 0 003 15z" />
                        </svg>
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-zinc-900 truncate">podcast_intro.mp3</p>
                        <p className="text-[10px] text-zinc-500 truncate">320kbps • 44.1kHz</p>
                      </div>
                    </div>
                    <span className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Ready
                    </span>
                  </div>

                  {/* Waveform & Duration */}
                  <div className="flex items-center justify-between bg-white px-3 py-2 rounded-xl border border-zinc-200/80 shadow-2xs">
                    <div className="flex items-center gap-1">
                      {[35, 75, 50, 90, 60, 40, 80, 55, 95, 45, 70, 30].map((h, i) => (
                        <span key={i} style={{ height: `${h * 0.18}px` }} className="w-1 bg-violet-400 rounded-full"></span>
                      ))}
                    </div>
                    <span className="text-[11px] font-mono text-zinc-400">0:45</span>
                  </div>

                  {/* Button Row */}
                  <button
                    type="button"
                    onClick={() => onNavigate('studio')}
                    className="w-full py-2 px-3 rounded-xl text-xs font-bold bg-violet-600 hover:bg-violet-700 text-white shadow-sm shadow-violet-500/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                  >
                    <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    <span>Export MP3</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 2. STATS & CAPABILITIES BAR                                               */}
      {/* ========================================================================= */}
      <section className="py-12 border-y bg-white/70 backdrop-blur-md border-zinc-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div className="p-4 rounded-2xl bg-zinc-50/70 border border-zinc-200/70 shadow-xs">
              <p className="text-3xl sm:text-5xl font-extrabold bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
                10M+
              </p>
              <p className="text-xs sm:text-sm font-semibold text-zinc-600 mt-1.5">
                Characters Generated
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-zinc-50/70 border border-zinc-200/70 shadow-xs">
              <p className="text-3xl sm:text-5xl font-extrabold text-zinc-900">
                99.8%
              </p>
              <p className="text-xs sm:text-sm font-semibold text-zinc-600 mt-1.5">
                Human Parity Score
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-zinc-50/70 border border-zinc-200/70 shadow-xs">
              <p className="text-3xl sm:text-5xl font-extrabold text-indigo-600">
                50K+
              </p>
              <p className="text-xs sm:text-sm font-semibold text-zinc-600 mt-1.5">
                Active Creators & Teams
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-zinc-50/70 border border-zinc-200/70 shadow-xs">
              <p className="text-3xl sm:text-5xl font-extrabold text-zinc-900">
                120+
              </p>
              <p className="text-xs sm:text-sm font-semibold text-zinc-600 mt-1.5">
                Studio Neural Voices
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 3. CORE FEATURES & VALUE PILLARS                                         */}
      {/* ========================================================================= */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 px-3.5 py-1 rounded-full bg-indigo-50 border border-indigo-200/80 shadow-xs">
            Why SK VoiceClone Studio?
          </span>
          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight mt-4 text-zinc-900">
            Built for Commercial Speed & Audio Perfection
          </h2>
          <p className="mt-3 text-sm sm:text-base leading-relaxed text-zinc-600">
            Everything you need to clone voices, orchestrate multi-character audiobooks, and export broadcast-grade narration without expensive voice actors or studio rental.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Feature 1 */}
          <div className="p-7 rounded-3xl border border-zinc-200/90 bg-white shadow-xs hover:shadow-md hover:border-indigo-200 transition-all group">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center text-xl mb-5 shadow-xs group-hover:scale-105 transition-transform">
              🎙️
            </div>
            <h3 className="text-lg font-bold tracking-tight mb-2 text-zinc-900">Zero-Shot Voice Cloning</h3>
            <p className="text-xs text-zinc-600 leading-relaxed">
              Upload any clean 5-second audio sample (.wav) and replicate vocal timbre, cadence, and texture instantly. Keep your cloned voices saved to your private device registry for permanent reuse.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="p-7 rounded-3xl border border-zinc-200/90 bg-white shadow-xs hover:shadow-md hover:border-indigo-200 transition-all group">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center text-xl mb-5 shadow-xs group-hover:scale-105 transition-transform">
              🌍
            </div>
            <h3 className="text-lg font-bold tracking-tight mb-2 text-zinc-900">Multilingual & Native Accents</h3>
            <p className="text-xs text-zinc-600 leading-relaxed">
              Native-sounding pronunciation for English (US, UK, Australia, Ireland, Canada, India), Urdu, Hindi, Arabic, Spanish, French, German, Italian, Portuguese, Japanese, Korean, and Cantonese.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="p-7 rounded-3xl border border-zinc-200/90 bg-white shadow-xs hover:shadow-md hover:border-indigo-200 transition-all group">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center text-xl mb-5 shadow-xs group-hover:scale-105 transition-transform">
              🎛️
            </div>
            <h3 className="text-lg font-bold tracking-tight mb-2 text-zinc-900">Acoustic Modulation Suite</h3>
            <p className="text-xs text-zinc-600 leading-relaxed">
              Fine-tune vocal pacing (-50% to +50%), shift pitch for dramatic resonance, and inject natural micro-pauses between sentences for emotional nuance and theatrical suspense.
            </p>
          </div>

          {/* Feature 4 */}
          <div className="p-7 rounded-3xl border border-zinc-200/90 bg-white shadow-xs hover:shadow-md hover:border-indigo-200 transition-all group">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center text-xl mb-5 shadow-xs group-hover:scale-105 transition-transform">
              ⚡
            </div>
            <h3 className="text-lg font-bold tracking-tight mb-2 text-zinc-900">Background Task Queues</h3>
            <p className="text-xs text-zinc-600 leading-relaxed">
              Synthesize lengthy articles, chapters, and long-form scripts without browser freezing. Active generation jobs run smoothly in the background while you continue working.
            </p>
          </div>

          {/* Feature 5 */}
          <div className="p-7 rounded-3xl border border-zinc-200/90 bg-white shadow-xs hover:shadow-md hover:border-indigo-200 transition-all group">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center text-xl mb-5 shadow-xs group-hover:scale-105 transition-transform">
              💾
            </div>
            <h3 className="text-lg font-bold tracking-tight mb-2 text-zinc-900">Isolated Client History</h3>
            <p className="text-xs text-zinc-600 leading-relaxed">
              Every generation is saved strictly to your personal browser local storage with instant audio playback, script re-copy, and one-click MP3 download without storing personal scripts on server disks.
            </p>
          </div>

          {/* Feature 6 */}
          <div className="p-7 rounded-3xl border border-zinc-200/90 bg-white shadow-xs hover:shadow-md hover:border-indigo-200 transition-all group">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center text-xl mb-5 shadow-xs group-hover:scale-105 transition-transform">
              💼
            </div>
            <h3 className="text-lg font-bold tracking-tight mb-2 text-zinc-900">Commercial Broadcast Rights</h3>
            <p className="text-xs text-zinc-600 leading-relaxed">
              Every clip you create is 100% royalty-free for commercial use across YouTube monetization, Spotify podcasts, indie video games, TV commercials, and paid client work.
            </p>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 4. HOW IT WORKS (3 SIMPLE STEPS)                                         */}
      {/* ========================================================================= */}
      <section className="py-20 border-y bg-zinc-50/80 border-zinc-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 px-3.5 py-1 rounded-full bg-indigo-50 border border-indigo-200/80 shadow-xs">
              Workflow Simplicity
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mt-4 text-zinc-900">
              Three Steps From Script to Master Audio
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {/* Step 1 */}
            <div className="p-8 rounded-3xl border border-zinc-200/90 bg-white shadow-xs hover:shadow-md transition-all">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 font-mono font-black text-lg flex items-center justify-center mb-5 border border-indigo-100">
                01
              </div>
              <h3 className="text-lg font-bold mb-2 text-zinc-900">Input Script & Select Voice</h3>
              <p className="text-xs text-zinc-600 leading-relaxed">
                Choose from 120+ pre-trained studio human models or upload your own 5-second voice sample to clone a unique custom speaker.
              </p>
            </div>

            {/* Step 2 */}
            <div className="p-8 rounded-3xl border border-zinc-200/90 bg-white shadow-xs hover:shadow-md transition-all">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 font-mono font-black text-lg flex items-center justify-center mb-5 border border-indigo-100">
                02
              </div>
              <h3 className="text-lg font-bold mb-2 text-zinc-900">Fine-Tune Acoustics & Pitch</h3>
              <p className="text-xs text-zinc-600 leading-relaxed">
                Adjust speaking rate, pitch modulation, and natural sentence pauses with immediate live preview before final synthesis.
              </p>
            </div>

            {/* Step 3 */}
            <div className="p-8 rounded-3xl border border-zinc-200/90 bg-white shadow-xs hover:shadow-md transition-all">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 font-mono font-black text-lg flex items-center justify-center mb-5 border border-indigo-100">
                03
              </div>
              <h3 className="text-lg font-bold mb-2 text-zinc-900">Instant Studio Audio & MP3</h3>
              <p className="text-xs text-zinc-600 leading-relaxed">
                Hit synthesize. The neural engine compiles your audio in seconds, ready to preview in high fidelity and download in MP3 format.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 5. COMMERCIAL PACKAGES QUICK TEASER                                      */}
      {/* ========================================================================= */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="p-8 sm:p-12 rounded-3xl border border-zinc-200/90 bg-white text-center relative overflow-hidden shadow-xl shadow-zinc-900/5">
          <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-50/60 rounded-full blur-3xl pointer-events-none"></div>
          <div className="max-w-2xl mx-auto relative z-10">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 px-3.5 py-1 rounded-full bg-indigo-50 border border-indigo-200/80">
              Commercial Pricing
            </span>
            <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight mt-4 text-zinc-900">
              Plans Starting From <span className="text-indigo-600">FREE</span>
            </h2>
            <p className="text-xs sm:text-sm text-zinc-600 mt-3 leading-relaxed">
              Explore our flexible commercial tiers: <strong className="text-zinc-900">Free (2k credits)</strong>, <strong className="text-indigo-600 font-extrabold">Silver (PKR 1,600/mo)</strong>, <strong className="text-zinc-900">Lite (PKR 2,800/mo)</strong>, <strong className="text-zinc-900">Pro (PKR 4,750/mo)</strong>, and <strong className="text-zinc-900">Studio (PKR 6,700/mo)</strong> with up to 3,000,000 characters and 30 cloned voices.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                type="button"
                onClick={() => onNavigate('pricing')}
                className="px-8 py-3.5 rounded-xl text-xs font-bold bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white transition-all shadow-md shadow-indigo-500/25 active:scale-95"
              >
                Compare All Packages →
              </button>
              <button
                type="button"
                onClick={() => onNavigate('studio')}
                className="px-6 py-3.5 rounded-xl text-xs font-bold bg-white hover:bg-zinc-50 text-zinc-800 border border-zinc-300 transition-all shadow-xs"
              >
                Try Free In Studio
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 6. CALL TO ACTION BANNER                                                 */}
      {/* ========================================================================= */}
      <section className="pb-24 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto text-center">
        <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-zinc-900">
          Ready to Bring Your Words to Life?
        </h2>
        <p className="mt-3 text-sm max-w-xl mx-auto text-zinc-600">
          Join thousands of content creators, educators, and businesses using SK VoiceClone Studio for studio-grade audio synthesis.
        </p>
        <div className="mt-7 flex items-center justify-center gap-4">
          <button
            onClick={() => onNavigate('studio')}
            className="px-8 py-3.5 rounded-xl text-xs font-bold bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white shadow-lg shadow-indigo-500/25 transition-all active:scale-95"
          >
            Start Creating (2,000 Free Credits)
          </button>
        </div>
      </section>
    </div>
  );
}
