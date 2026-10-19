import React from 'react';

export default function Footer({ onNavigate }) {
  return (
    <footer className="border-t transition-colors duration-200 mt-auto relative z-10 bg-[#09090b] border-zinc-800/80 text-zinc-400">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
          {/* Brand Info */}
          <div className="md:col-span-1 space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm bg-white text-black shadow-sm">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 100-6 3 3 0 000 6z" />
                </svg>
              </div>
              <span className="font-bold tracking-tight text-base text-white">
                SK - VoiceClone
              </span>
            </div>
            <p className="text-xs leading-relaxed text-zinc-400">
              Professional-grade neural AI voice cloning & speech synthesis platform. 120+ studio human voices across 35+ regional accents.
            </p>
            <div className="flex items-center gap-2 text-xs font-medium text-emerald-400 pt-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>All Systems Operational (XTTS-v2 & Edge)</span>
            </div>
          </div>

          {/* Product Links */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">Product</h4>
            <ul className="space-y-1.5 text-xs">
              <li>
                <button onClick={() => onNavigate('studio')} className="hover:text-white transition-colors">
                  Voice Studio
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('pricing')} className="hover:text-white transition-colors">
                  Pricing & Plans
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('home', '#voices')} className="hover:text-white transition-colors">
                  120+ Voice Library
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('home')} className="hover:text-white transition-colors">
                  Voice Cloning Tech
                </button>
              </li>
            </ul>
          </div>

          {/* Commercial & Use Cases */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">Use Cases</h4>
            <ul className="space-y-1.5 text-xs">
              <li><span className="cursor-pointer hover:text-white" onClick={() => onNavigate('home')}>YouTube Creators & Streamers</span></li>
              <li><span className="cursor-pointer hover:text-white" onClick={() => onNavigate('home')}>Audiobooks & Audio Dramas</span></li>
              <li><span className="cursor-pointer hover:text-white" onClick={() => onNavigate('home')}>Multilingual Dubbing & Ads</span></li>
              <li><span className="cursor-pointer hover:text-white" onClick={() => onNavigate('home')}>Video Game Character Dialogue</span></li>
            </ul>
          </div>

          {/* Legal & Security */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">Commercial & Rights</h4>
            <ul className="space-y-1.5 text-xs">
              <li><span>100% Commercial Usage License</span></li>
              <li><span>Device-Isolated Voice Privacy</span></li>
              <li><span>Zero Data Selling Policy</span></li>
              <li><span>24/7 Dedicated Server Engine</span></li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-zinc-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-500">
          <p>© {new Date().getFullYear()} SK - VoiceClone Studio Inc. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <span className="hover:underline cursor-pointer">Privacy Policy</span>
            <span className="hover:underline cursor-pointer">Terms of Service</span>
            <span className="hover:underline cursor-pointer">API Documentation</span>
            <span className="hover:underline cursor-pointer">Status</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
