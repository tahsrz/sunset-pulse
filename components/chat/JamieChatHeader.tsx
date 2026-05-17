'use client';

import React from 'react';
import { FaRobot, FaMinus, FaExchangeAlt, FaVolumeUp, FaVolumeMute } from 'react-icons/fa';

interface JamieChatHeaderProps {
  onMinimize: () => void;
  isLefthandMode: boolean;
  onToggleLefthand: () => void;
  isVoiceEnabled: boolean;
  onToggleVoice: () => void;
}

const JamieChatHeader: React.FC<JamieChatHeaderProps> = ({ 
  onMinimize, 
  isLefthandMode, 
  onToggleLefthand,
  isVoiceEnabled,
  onToggleVoice
}) => {
  return (
    <div className="bg-gradient-to-r from-blue-600 to-blue-400 p-5 text-white flex justify-between items-center shadow-lg shrink-0 relative overflow-hidden group">
      <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity animate-pulse pointer-events-none" />
      
      <div className="flex items-center gap-3 relative z-10">
        <div className="p-2 bg-white/20 rounded-lg backdrop-blur-md border border-white/10 group-hover:scale-110 transition-transform">
          <FaRobot className="text-lg" />
        </div>
        <div>
          <h3 className="font-black tracking-[0.1em] uppercase text-sm italic">Jamie</h3>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500"></span>
            </span>
            <p className="text-[8px] opacity-70 font-bold uppercase tracking-widest">Analyst Online</p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 relative z-10">
        <button 
          onClick={onToggleVoice} 
          title={isVoiceEnabled ? "Mute Jamie" : "Unmute Jamie"}
          className="p-2 hover:bg-white/20 rounded-lg transition-colors"
        >
          {isVoiceEnabled ? <FaVolumeUp className="text-[10px]" /> : <FaVolumeMute className="text-[10px] text-white/50" />}
        </button>
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
      </div>
    </div>
  );
};

export default JamieChatHeader;
