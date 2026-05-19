'use client';

import React from 'react';
import { FaRobot } from 'react-icons/fa';

interface JamieChatMinimizedProps {
  onOpen: () => void;
  isLefthandMode: boolean;
}

const JamieChatMinimized: React.FC<JamieChatMinimizedProps> = ({ onOpen, isLefthandMode }) => {
  return (
    <div className={`fixed top-1/2 ${isLefthandMode ? 'left-0' : 'right-0'} z-50 -translate-y-1/2 transition-all duration-500`}>
      <button
        onClick={onOpen}
        aria-label="Open Jamie"
        className={`group flex h-40 w-12 flex-col items-center justify-center gap-3 border border-blue-200/20 bg-gradient-to-b from-blue-600 to-cyan-500 text-white shadow-2xl shadow-cyan-950/40 transition-all duration-300 hover:w-14 hover:brightness-110 ${
          isLefthandMode ? 'rounded-r-xl border-l-0' : 'rounded-l-xl border-r-0'
        }`}
      >
        <span className="h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_14px_rgba(110,231,183,0.8)]" />
        <FaRobot className="text-lg transition-transform group-hover:scale-110" />
        <span className="[writing-mode:vertical-rl] rotate-180 text-[10px] font-black uppercase tracking-[0.24em]">
          Jamie
        </span>
      </button>
    </div>
  );
};

export default JamieChatMinimized;
