'use client';

import React from 'react';
import { FaRobot } from 'react-icons/fa';

interface JamieChatMinimizedProps {
  onOpen: () => void;
  isLefthandMode: boolean;
}

const JamieChatMinimized: React.FC<JamieChatMinimizedProps> = ({ onOpen, isLefthandMode }) => {
  return (
    <div className={`fixed bottom-5 ${isLefthandMode ? 'left-5' : 'right-5'} z-50 transition-all duration-500`}>
      <button
        onClick={onOpen}
        className="w-16 h-16 bg-gradient-to-br from-blue-600 to-blue-400 rounded-full flex items-center justify-center text-white shadow-2xl hover:scale-110 transition-all duration-300 border-2 border-white/20 relative"
      >
        <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-slate-900 animate-pulse" />
        <FaRobot className="text-2xl" />
      </button>
    </div>
  );
};

export default JamieChatMinimized;
