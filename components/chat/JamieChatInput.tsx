'use client';

import React from 'react';
import { FaCogs } from 'react-icons/fa';
import JamieSuggestions from './JamieSuggestions';

interface JamieChatInputProps {
  input: string;
  handleInputChange: (e: any) => void;
  handleSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  handleKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  isLoading: boolean;
  suggestions: string[];
  onSelectSuggestion: (q: string) => void;
  isDevMode: boolean;
}

const VIBES = [
  'Dark Mode', 'Cyberpunk', 'Tactical', 'Minimalist', 'Moody', 
  'Forest', 'Sunset', 'Oceanic', 'Luxury', 'Terminal'
];

const JamieChatInput: React.FC<JamieChatInputProps> = ({
  input,
  handleInputChange,
  handleSubmit,
  handleKeyDown,
  isLoading,
  suggestions,
  onSelectSuggestion,
  isDevMode,
}) => {
  return (
    <form onSubmit={handleSubmit} className="p-6 bg-slate-950/50 border-t border-white/5 shrink-0">
      <JamieSuggestions items={suggestions} onSelect={onSelectSuggestion} />

      {isDevMode && (
        <div className="mb-4 flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {VIBES.map((vibe) => (
            <button 
              key={vibe} 
              type="button" 
              onClick={() => handleInputChange({ target: { value: `Switch to ${vibe} theme.` } } as any)} 
              className="whitespace-nowrap bg-blue-500/10 border border-blue-500/30 text-[9px] font-black uppercase tracking-widest text-blue-400 px-3 py-1.5 rounded-full hover:bg-blue-500 hover:text-white transition-all"
            >
              {vibe}
            </button>
          ))}
        </div>
      )}
      
      <div className="relative group/input">
        <input 
          className="w-full p-4 bg-slate-900 border border-white/10 rounded-2xl text-sm text-white focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all duration-300 placeholder:text-slate-600" 
          value={input} 
          placeholder="Search or ask..." 
          onChange={handleInputChange} 
          onKeyDown={handleKeyDown}
          autoComplete="off"
        />
        <button 
          type="submit" 
          className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-blue-500 hover:text-blue-400 transition-colors"
        >
          <FaCogs className={isLoading ? 'animate-spin' : ''} />
        </button>
      </div>
    </form>
  );
};

export default JamieChatInput;
