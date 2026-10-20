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
    <div className="text-zinc-100 overflow-x-clip">
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
      <section className="relative pt-14 pb-20 md:pt-24 md:pb-28 px-4 sm:px-6 lg:px-8 overflow-hidden">
        {/* Subtle monochrome ambient glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] sm:w-[950px] h-[350px] bg-white/[0.03] rounded-full blur-[140px] pointer-events-none"></div>

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center max-w-4xl mx-auto">
            {/* Announcement Pill */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold tracking-wide bg-zinc-900 text-zinc-300 border border-zinc-800 mb-6 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>ElevenLabs-Grade AI Voice Cloning & Neural TTS</span>
            </div>

            {/* Main Headline (Pure Black & White with Clean Contrast) */}
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.1] text-white">
              Create Lifelike AI Voices in Any Language, Any Tone.
            </h1>

            {/* Subtitle */}
            <p className="mt-6 text-base sm:text-xl leading-relaxed max-w-3xl mx-auto font-normal text-zinc-400">
              Transform your script into studio-quality speech with <strong className="text-zinc-200">120+ natural neural voices</strong> across <strong className="text-zinc-200">35+ regional accents</strong>. Clone custom voices from a 5-second sample with precision acoustic control over speed, pitch, and natural pauses.
            </p>

            {/* CTA Buttons Group (Black & White Monochromatic) */}
            <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                type="button"
                onClick={() => onNavigate('studio')}
                className="w-full sm:w-auto px-8 py-4 rounded-2xl text-sm font-bold bg-white hover:bg-zinc-200 text-black shadow-lg shadow-white/5 transition-all transform hover:-translate-y-0.5 active:scale-95 flex items-center justify-center gap-2"
              >
                <span>Launch Voice Studio Free</span>
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-black/10 text-black font-extrabold">
                  ⚡ 2k Credits
                </span>
                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </button>

              <button
                type="button"
                onClick={() => onNavigate('pricing')}
                className="w-full sm:w-auto px-7 py-4 rounded-2xl text-sm font-bold border border-zinc-700/80 bg-zinc-900 hover:bg-zinc-800 text-white shadow-sm transition-all"
              >
                View Commercial Packages
              </button>

              <button
                type="button"
                onClick={() => {
                  const el = document.getElementById('voices');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
                className="w-full sm:w-auto px-5 py-4 rounded-2xl text-sm font-medium text-zinc-400 hover:text-white transition-colors"
              >
                Browse 120+ Voices →
              </button>
            </div>

            {/* Quick Micro-Metrics */}
            <div className="mt-10 pt-8 border-t border-zinc-800/80 flex flex-wrap items-center justify-center gap-6 sm:gap-12 text-xs font-semibold text-zinc-400">
              <div className="flex items-center gap-2">
                <span className="text-emerald-400 font-bold">✓</span>
                <span>No Credit Card Required</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-emerald-400 font-bold">✓</span>
                <span>100% Commercial Broadcast Rights</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-emerald-400 font-bold">✓</span>
                <span>Sub-second Neural Synthesis</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-emerald-400 font-bold">✓</span>
                <span>Device-Isolated Voice Privacy</span>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* HERO LIVE VOICE AUDITION WIDGET                                           */}
          {/* ========================================================================= */}
          <div id="voices" className="mt-14 max-w-4xl mx-auto scroll-mt-24">
            <div className="rounded-3xl border border-zinc-800 bg-[#121215] p-5 sm:p-7 shadow-2xl backdrop-blur-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-zinc-800/80">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    <h3 className="text-sm sm:text-base font-bold tracking-tight text-white">
                      Audition Studio Voices in Real-Time
                    </h3>
                  </div>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Click any model below to listen to its natural cadence, emotional depth, and studio audio fidelity.
                  </p>
                </div>
                <button
                  onClick={() => onNavigate('studio')}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-white text-black hover:bg-zinc-200 transition-colors shadow-sm"
                >
                  Use In Studio →
                </button>
              </div>

              {/* Demo Voice Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {heroDemoVoices.map((item) => {
                  const isSelected = activeDemoVoice === item.id;
                  const isPlayingThis = isSelected && isPlayingDemo;

                  return (
                    <div
                      key={item.id}
                      onClick={() => handleToggleDemoPlay(item.id)}
                      className={`p-4 rounded-2xl border cursor-pointer transition-all duration-200 relative ${
                        isSelected
                          ? 'bg-zinc-800/90 border-zinc-600 shadow-lg text-white'
                          : 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800/50 text-zinc-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2.5">
                          <span className="w-7 h-7 rounded-lg bg-zinc-800 text-zinc-300 border border-zinc-700/80 font-bold text-xs flex items-center justify-center shrink-0">
                            {item.flag}
                          </span>
                          <div>
                            <h4 className="text-sm font-bold leading-tight text-white">{item.name}</h4>
                            <span className="text-[11px] text-zinc-400">{item.accent}</span>
                          </div>
                        </div>

                        {/* Play / Pause Pill Button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleDemoPlay(item.id);
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                            isPlayingThis
                              ? 'bg-white text-black font-bold shadow-md'
                              : 'bg-zinc-800/90 text-zinc-200 hover:bg-zinc-700 hover:text-white border border-zinc-700'
                          }`}
                        >
                          {isPlayingThis ? (
                            <>
                              <span className="w-1.5 h-1.5 rounded-full bg-black animate-ping"></span>
                              <span>Pause</span>
                            </>
                          ) : (
                            <>
                              <svg width="10" height="10" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M8 5v14l11-7z" />
                              </svg>
                              <span>Play Demo</span>
                            </>
                          )}
                        </button>
                      </div>

                      <p className="text-xs text-zinc-300 italic line-clamp-2 leading-relaxed">
                        "{item.sampleText}"
                      </p>

                      {/* Animated Waveform bar when playing */}
                      {isPlayingThis && (
                        <div className="mt-3 flex items-center gap-1 h-3">
                          {[40, 80, 50, 95, 30, 70, 100, 60, 85, 45, 90, 35].map((h, i) => (
                            <span
                              key={i}
                              className="w-1 bg-white rounded-full animate-pulse"
                              style={{
                                height: `${h}%`,
                                animationDelay: `${i * 70}ms`
                              }}
                            ></span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 2. STATS & CAPABILITIES BAR                                               */}
      {/* ========================================================================= */}
      <section className="py-12 border-y bg-[#0c0a12] border-zinc-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <p className="text-3xl sm:text-5xl font-black text-white">120+</p>
              <p className="text-xs sm:text-sm font-semibold text-zinc-400 mt-1">
                Studio Neural Voices
              </p>
            </div>
            <div>
              <p className="text-3xl sm:text-5xl font-black text-white">35+</p>
              <p className="text-xs sm:text-sm font-semibold text-zinc-400 mt-1">
                Regional Accents & Dialects
              </p>
            </div>
            <div>
              <p className="text-3xl sm:text-5xl font-black text-emerald-400">2,000</p>
              <p className="text-xs sm:text-sm font-semibold text-zinc-400 mt-1">
                Free Starter Credits
              </p>
            </div>
            <div>
              <p className="text-3xl sm:text-5xl font-black text-white">&lt; 1.2s</p>
              <p className="text-xs sm:text-sm font-semibold text-zinc-400 mt-1">
                Fast Generation Latency
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
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-300 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800">
            Why SK - VoiceClone Studio?
          </span>
          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight mt-3 text-white">
            Built for Commercial Speed & Audio Perfection
          </h2>
          <p className="mt-3 text-sm sm:text-base leading-relaxed text-zinc-400">
            Everything you need to clone voices, orchestrate multi-character audiobooks, and export broadcast-grade narration without expensive voice actors or studio rental.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Feature 1 */}
          <div className="p-7 rounded-3xl border border-zinc-800/80 bg-[#121215] transition-all hover:border-zinc-700">
            <div className="w-12 h-12 rounded-2xl bg-zinc-900 text-white border border-zinc-800 flex items-center justify-center text-xl mb-5">
              🎙️
            </div>
            <h3 className="text-lg font-bold tracking-tight mb-2 text-white">Zero-Shot Voice Cloning</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Upload any clean 5-second audio sample (.wav) and replicate vocal timbre, cadence, and texture instantly. Keep your cloned voices saved to your private device registry for permanent reuse.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="p-7 rounded-3xl border border-zinc-800/80 bg-[#121215] transition-all hover:border-zinc-700">
            <div className="w-12 h-12 rounded-2xl bg-zinc-900 text-white border border-zinc-800 flex items-center justify-center text-xl mb-5">
              🌍
            </div>
            <h3 className="text-lg font-bold tracking-tight mb-2 text-white">Multilingual & Native Accents</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Native-sounding pronunciation for English (US, UK, Australia, Ireland, Canada, India), Urdu, Hindi, Arabic, Spanish, French, German, Italian, Portuguese, Japanese, Korean, and Cantonese.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="p-7 rounded-3xl border border-zinc-800/80 bg-[#121215] transition-all hover:border-zinc-700">
            <div className="w-12 h-12 rounded-2xl bg-zinc-900 text-white border border-zinc-800 flex items-center justify-center text-xl mb-5">
              🎛️
            </div>
            <h3 className="text-lg font-bold tracking-tight mb-2 text-white">Acoustic Modulation Suite</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Fine-tune vocal pacing (-50% to +50%), shift pitch for dramatic resonance, and inject natural micro-pauses between sentences for emotional nuance and theatrical suspense.
            </p>
          </div>

          {/* Feature 4 */}
          <div className="p-7 rounded-3xl border border-zinc-800/80 bg-[#121215] transition-all hover:border-zinc-700">
            <div className="w-12 h-12 rounded-2xl bg-zinc-900 text-white border border-zinc-800 flex items-center justify-center text-xl mb-5">
              ⚡
            </div>
            <h3 className="text-lg font-bold tracking-tight mb-2 text-white">Background Task Queues</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Synthesize lengthy articles, chapters, and long-form scripts without browser freezing. Active generation jobs run smoothly in the background while you continue working.
            </p>
          </div>

          {/* Feature 5 */}
          <div className="p-7 rounded-3xl border border-zinc-800/80 bg-[#121215] transition-all hover:border-zinc-700">
            <div className="w-12 h-12 rounded-2xl bg-zinc-900 text-white border border-zinc-800 flex items-center justify-center text-xl mb-5">
              💾
            </div>
            <h3 className="text-lg font-bold tracking-tight mb-2 text-white">Persistent Device History</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Every generation is saved directly to your isolated device timeline with instant audio playback, script re-copy, and one-click MP3 download without losing previous work.
            </p>
          </div>

          {/* Feature 6 */}
          <div className="p-7 rounded-3xl border border-zinc-800/80 bg-[#121215] transition-all hover:border-zinc-700">
            <div className="w-12 h-12 rounded-2xl bg-zinc-900 text-white border border-zinc-800 flex items-center justify-center text-xl mb-5">
              💼
            </div>
            <h3 className="text-lg font-bold tracking-tight mb-2 text-white">Commercial Broadcast Rights</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Every clip you create is 100% royalty-free for commercial use across YouTube monetization, Spotify podcasts, indie video games, TV commercials, and paid client work.
            </p>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 4. HOW IT WORKS (3 SIMPLE STEPS)                                         */}
      {/* ========================================================================= */}
      <section className="py-20 border-y bg-[#0c0a12] border-zinc-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-300 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800">
              Workflow Simplicity
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mt-3 text-white">
              Three Steps From Script to Master Audio
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {/* Step 1 */}
            <div className="p-8 rounded-3xl border border-zinc-800 bg-[#121215]">
              <div className="text-4xl font-black text-zinc-600 mb-4">01</div>
              <h3 className="text-lg font-bold mb-2 text-white">Select or Clone Voice</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Choose from 120+ pre-trained studio human models or upload your own 5-second voice sample to clone a unique custom speaker.
              </p>
            </div>

            {/* Step 2 */}
            <div className="p-8 rounded-3xl border border-zinc-800 bg-[#121215]">
              <div className="text-4xl font-black text-zinc-600 mb-4">02</div>
              <h3 className="text-lg font-bold mb-2 text-white">Input Script & Tone</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Type or paste your text. Use the acoustic modulation sliders to adjust speaking rate, pitch modulation, and natural sentence pauses.
              </p>
            </div>

            {/* Step 3 */}
            <div className="p-8 rounded-3xl border border-zinc-800 bg-[#121215]">
              <div className="text-4xl font-black text-zinc-600 mb-4">03</div>
              <h3 className="text-lg font-bold mb-2 text-white">Generate & Download</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
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
        <div className="p-8 sm:p-12 rounded-3xl border border-zinc-800 bg-[#121215] text-center relative overflow-hidden">
          <div className="max-w-2xl mx-auto relative z-10">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-300 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800">
              Commercial Pricing
            </span>
            <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight mt-4 text-white">
              Plans Starting From <span className="text-emerald-400">FREE</span>
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 mt-3 leading-relaxed">
              Explore our 4 transparent tiers: <strong className="text-white">Free (2k credits)</strong>, <strong className="text-white">Lite (PKR 2,800/mo)</strong>, <strong className="text-white">Pro (PKR 4,750/mo)</strong>, and <strong className="text-white">Studio (PKR 6,700/mo)</strong> with up to 3,000,000 characters and 30 cloned voices.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                type="button"
                onClick={() => onNavigate('pricing')}
                className="px-8 py-3.5 rounded-xl text-xs font-bold bg-white text-black hover:bg-zinc-200 transition-all shadow-md active:scale-95"
              >
                Compare All 4 Packages →
              </button>
              <button
                type="button"
                onClick={() => onNavigate('studio')}
                className="px-6 py-3.5 rounded-xl text-xs font-bold bg-zinc-900 hover:bg-zinc-800 text-white border border-zinc-700 transition-all"
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
        <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
          Ready to Bring Your Words to Life?
        </h2>
        <p className="mt-3 text-sm max-w-xl mx-auto text-zinc-400">
          Join thousands of content creators, educators, and businesses using SK - VoiceClone Studio for studio-grade audio synthesis.
        </p>
        <div className="mt-7 flex items-center justify-center gap-4">
          <button
            onClick={() => onNavigate('studio')}
            className="px-8 py-3.5 rounded-xl text-xs font-bold bg-white hover:bg-zinc-200 text-black shadow-lg shadow-white/5 transition-all active:scale-95"
          >
            Start Creating (2,000 Free Credits)
          </button>
        </div>
      </section>
    </div>
  );
}
