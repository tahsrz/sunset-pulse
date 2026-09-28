'use client';

import React from 'react';
import { FaBolt, FaHome } from 'react-icons/fa';

export type StageMode = 'STAGED' | 'LIVE';

interface StageSwitcherProps {
  mode: StageMode;
  onModeChange: (mode: StageMode) => void;
  liveStatus?: string;
}

const StageSwitcher: React.FC<StageSwitcherProps> = ({ mode, onModeChange, liveStatus = 'Explore current listings' }) => {
  return (
    <div className="flex flex-col items-center mb-12">
      <div className="grid w-full max-w-lg grid-cols-2 gap-1 p-1.5 bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl shadow-black/40">
        <button
          type="button"
          aria-pressed={mode === 'STAGED'}
          onClick={() => onModeChange('STAGED')}
          className={`flex min-h-12 items-center justify-center gap-2 px-3 py-3 rounded-xl text-xs font-bold transition-all duration-500 ${
            mode === 'STAGED'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
              : 'text-slate-300 hover:text-white hover:bg-white/5'
          }`}
        >
          <FaHome className={mode === 'STAGED' ? 'animate-pulse' : ''} />
          <span>Curated Listings</span>
        </button>
        <button
          type="button"
          aria-pressed={mode === 'LIVE'}
          onClick={() => onModeChange('LIVE')}
          className={`flex min-h-12 items-center justify-center gap-2 px-3 py-3 rounded-xl text-xs font-bold transition-all duration-500 ${
            mode === 'LIVE'
              ? 'bg-teal-500 text-white shadow-lg shadow-teal-500/30'
              : 'text-slate-300 hover:text-white hover:bg-white/5'
          }`}
        >
          <FaBolt className={mode === 'LIVE' ? 'animate-pulse' : ''} />
          <span>Live MLS Feed</span>
        </button>
      </div>
      
      <div className="mt-4 flex items-center gap-3 text-center" role="status">
        <div className="h-px w-12 bg-white/20" />
        <span className="text-xs leading-5 text-slate-300">
          {mode === 'STAGED' 
            ? 'Showing selected properties'
            : liveStatus}
        </span>
        <div className="h-px w-12 bg-white/20" />
      </div>
    </div>
  );
};

export default StageSwitcher;
