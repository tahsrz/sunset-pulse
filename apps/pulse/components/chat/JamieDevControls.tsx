'use client';

import React, { useState } from 'react';
import { FaTerminal, FaLock, FaSkull, FaSync } from 'react-icons/fa';
import { useAuth } from '@/context/AuthContext';
import { useVibe } from '@/context/VibeContext';

interface MakielProps {
  isActive: boolean;
  onToggle: (state: boolean) => void;
}

const Makiel: React.FC<MakielProps> = ({ isActive, onToggle }) => {
  const { user } = useAuth();
  const isSubscribed = user?.user_metadata?.isSubscribed;

  return (
    <button 
      onClick={() => onToggle(!isActive)}
      className={`group relative flex items-center justify-center gap-2 py-2 px-4 rounded-full text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-500 overflow-hidden ${
        isActive 
          ? 'bg-orange-500 text-white shadow-[0_0_20px_rgba(249,115,22,0.4)] scale-105' 
          : isSubscribed 
            ? 'bg-slate-900/80 text-slate-400 border border-white/10 backdrop-blur-md'
            : 'bg-slate-950 text-slate-600 border border-red-500/20 grayscale cursor-not-allowed'
      }`}
    >
      <div className={`absolute inset-0 bg-white/20 -translate-x-full group-hover:translate-x-0 transition-transform duration-500`} />
      {!isSubscribed && <FaLock className="text-[8px] text-red-500/50" />}
      <FaTerminal className={isActive ? 'animate-pulse' : ''} /> 
      <span className="relative">{isActive ? 'Oversight: On' : isSubscribed ? 'Oversight: Off' : 'Oversight: Locked'}</span>
    </button>
  );
};

const VIBE_SEQUENCE = ['default', 'vibe-maxxing', 'vibe-expanding-brain', 'vibe-leaning-forward', 'vibe-this-is-fine', 'vibe-institutional'];

export default function JamieDevControls({ isActive, onToggle }: MakielProps) {
  const [chaosMode, setChaosMode] = useState(false);
  const { currentVibe, setCurrentVibe } = useVibe();

  const handleCycleVibe = () => {
    const currentIndex = VIBE_SEQUENCE.indexOf(currentVibe);
    const nextIndex = (currentIndex + 1) % VIBE_SEQUENCE.length;
    setCurrentVibe(VIBE_SEQUENCE[nextIndex]);
  };

  const isMock = process.env.NEXT_PUBLIC_MOCK_MODE === 'true';

  return (
    <div className="flex flex-wrap items-center gap-2 px-4 py-1">
      <Makiel isActive={isActive} onToggle={onToggle} />
      
      {(isActive || isMock) && (
        <>
          <button
            onClick={() => setChaosMode(!chaosMode)}
            className={`group relative flex items-center justify-center gap-2 py-2 px-4 rounded-full text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-500 overflow-hidden border ${
              chaosMode
                ? 'bg-red-600 border-red-500 text-white shadow-[0_0_20px_rgba(220,38,38,0.4)] scale-105'
                : 'bg-slate-900/80 border-white/10 text-slate-400 backdrop-blur-md hover:border-red-500/40 hover:text-red-400'
            }`}
          >
            <FaSkull className={chaosMode ? 'animate-bounce text-red-200' : 'text-slate-500'} />
            <span>Chaos: {chaosMode ? 'ON' : 'OFF'}</span>
          </button>

          <button
            onClick={handleCycleVibe}
            disabled={!chaosMode}
            className={`group relative flex items-center justify-center gap-2 py-2 px-4 rounded-full text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-500 overflow-hidden border ${
              chaosMode
                ? 'bg-cyan-600 border-cyan-500 text-white hover:bg-cyan-500 hover:shadow-[0_0_20px_rgba(6,182,212,0.4)]'
                : 'bg-slate-950/40 border-white/5 text-slate-600 cursor-not-allowed'
            }`}
          >
            <FaSync className={chaosMode ? 'group-hover:rotate-180 transition-transform duration-700' : ''} />
            <span>Cycle Vibe</span>
          </button>
        </>
      )}
    </div>
  );
}
