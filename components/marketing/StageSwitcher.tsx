'use client';

import React from 'react';
import { FaLayerGroup, FaBolt, FaShieldAlt } from 'react-icons/fa';

export type StageMode = 'STAGED' | 'LIVE';

interface StageSwitcherProps {
  mode: StageMode;
  onModeChange: (mode: StageMode) => void;
}

const StageSwitcher: React.FC<StageSwitcherProps> = ({ mode, onModeChange }) => {
  return (
    <div className="flex flex-col items-center mb-12">
      <div className="inline-flex p-1.5 bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl shadow-black/40">
        <button
          onClick={() => onModeChange('STAGED')}
          className={`flex items-center gap-3 px-8 py-3 rounded-xl text-xs font-black uppercase tracking-[0.2em] transition-all duration-500 ${
            mode === 'STAGED'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
              : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
          }`}
        >
          <FaShieldAlt className={mode === 'STAGED' ? 'animate-pulse' : ''} />
          <span>Curated Stage</span>
        </button>
        <button
          onClick={() => onModeChange('LIVE')}
          className={`flex items-center gap-3 px-8 py-3 rounded-xl text-xs font-black uppercase tracking-[0.2em] transition-all duration-500 ${
            mode === 'LIVE'
              ? 'bg-teal-500 text-white shadow-lg shadow-teal-500/30'
              : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
          }`}
        >
          <FaBolt className={mode === 'LIVE' ? 'animate-pulse' : ''} />
          <span>Live MLS Feed</span>
        </button>
      </div>
      
      <div className="mt-4 flex items-center gap-4 opacity-40">
        <div className="h-px w-12 bg-white/20" />
        <span className="text-[9px] font-mono uppercase tracking-[0.4em] italic text-slate-400">
          {mode === 'STAGED' 
            ? 'Accessing high-signal property intelligence' 
            : 'Sourcing raw telemetry from regional grid'}
        </span>
        <div className="h-px w-12 bg-white/20" />
      </div>
    </div>
  );
};

export default StageSwitcher;
