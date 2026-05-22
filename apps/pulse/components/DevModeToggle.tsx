'use client';

import React from 'react';
import { FaTerminal } from 'react-icons/fa';

interface DevModeToggleProps {
  isDevMode: boolean;
  onToggle: (mode: boolean) => void;
}

const DevModeToggle: React.FC<DevModeToggleProps> = ({ isDevMode, onToggle }) => {
  return (
    <button 
      onClick={() => onToggle(!isDevMode)}
      className={`group relative flex items-center justify-center gap-2 py-2 px-4 rounded-full text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-500 overflow-hidden animate-in slide-in-from-bottom-5 ${
        isDevMode 
          ? 'bg-orange-500 text-white shadow-[0_0_20px_rgba(249,115,22,0.4)] scale-105' 
          : 'bg-slate-900/80 text-slate-400 border border-white/10 backdrop-blur-md'
      }`}
    >
      <div className={`absolute inset-0 bg-white/20 -translate-x-full group-hover:translate-x-0 transition-transform duration-500`} />
      <FaTerminal className={isDevMode ? 'animate-pulse' : ''} /> 
      <span className="relative">{isDevMode ? 'Admin Settings: On' : 'Admin Settings: Off'}</span>
    </button>
  );
};

export default DevModeToggle;
