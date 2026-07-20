'use client';

import React from 'react';
import { Bot } from 'lucide-react';

interface JamieChatMinimizedProps {
  onOpen: () => void;
  isLefthandMode: boolean;
  assistantName?: string;
}

const JamieChatMinimized: React.FC<JamieChatMinimizedProps> = ({ onOpen, isLefthandMode, assistantName = 'Jamie' }) => {
  return (
    <div className={`fixed bottom-4 ${isLefthandMode ? 'left-4 sm:left-0' : 'right-4 sm:right-0'} z-40 transition-all duration-500 sm:bottom-auto sm:top-1/2 sm:-translate-y-1/2`}>
      <button
        onClick={onOpen}
        aria-label={`Open ${assistantName}`}
        className={`group flex h-11 w-11 items-center justify-center rounded-lg border border-blue-200/20 bg-gradient-to-b from-blue-600 to-cyan-500 text-white shadow-2xl shadow-cyan-950/40 transition-all duration-300 hover:brightness-110 sm:h-40 sm:w-12 sm:flex-col sm:gap-3 sm:rounded-none sm:hover:w-14 ${
          isLefthandMode ? 'sm:rounded-r-xl sm:border-l-0' : 'sm:rounded-l-xl sm:border-r-0'
        }`}
      >
        <span className="hidden h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_14px_rgba(110,231,183,0.8)] sm:block" />
        <Bot size={18} className="transition-transform group-hover:scale-110" />
        <span className="hidden [writing-mode:vertical-rl] rotate-180 text-[10px] font-black uppercase tracking-[0.24em] sm:block">
          {assistantName}
        </span>
      </button>
    </div>
  );
};

export default JamieChatMinimized;
