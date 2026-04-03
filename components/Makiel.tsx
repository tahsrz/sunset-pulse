'use client';

import React from 'react';
import { FaTerminal, FaLock } from 'react-icons/fa';
import { useSession } from 'next-auth/react';

interface MakielProps {
  isActive: boolean;
  onToggle: (state: boolean) => void;
}

const Makiel: React.FC<MakielProps> = ({ isActive, onToggle }) => {
  const { data: session } = useSession();
  const isSubscribed = session?.user?.isSubscribed;

  return (
    <button 
      onClick={() => onToggle(!isActive)}
      className={`group relative flex items-center justify-center gap-2 py-2 px-4 rounded-full text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-500 overflow-hidden animate-in slide-in-from-bottom-5 ${
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

export default Makiel;
