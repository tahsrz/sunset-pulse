'use client';

import React from 'react';
import { FaRobot, FaMinus, FaExchangeAlt } from 'react-icons/fa';

interface JamieChatHeaderProps {
  onMinimize: () => void;
  isLefthandMode: boolean;
  onToggleLefthand: () => void;
}

const JamieChatHeader: React.FC<JamieChatHeaderProps> = ({ 
  onMinimize, 
  isLefthandMode, 
  onToggleLefthand 
}) => {
  return (
    <div className="bg-gradient-to-r from-blue-600 to-blue-400 p-5 text-white flex justify-between items-center shadow-lg shrink-0">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-white/20 rounded-lg backdrop-blur-md">
          <FaRobot className="text-lg" />
        </div>
        <div>
          <h3 className="font-black tracking-[0.1em] uppercase text-sm italic">Jamie</h3>
          <p className="text-[8px] opacity-70 font-bold uppercase tracking-widest">Active Session</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button 
          onClick={onToggleLefthand} 
          title="Toggle Lefthand Mode"
          className="p-2 hover:bg-white/20 rounded-lg transition-colors"
        >
          <FaExchangeAlt className="text-[10px]" />
        </button>
        <button 
          onClick={onMinimize} 
          className="p-2 hover:bg-white/20 rounded-lg transition-colors"
        >
          <FaMinus className="text-xs" />
        </button>
        <div className="h-3 w-3 bg-green-400 rounded-full shadow-[0_0_10px_rgba(74,222,128,0.5)]" />
      </div>
    </div>
  );
};

export default JamieChatHeader;
