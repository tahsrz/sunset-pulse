'use client';

import React from 'react';

interface SuggestionsBarProps {
  suggestions: string[];
  onSuggestionClick: (suggestion: string) => void;
}

const SuggestionsBar: React.FC<SuggestionsBarProps> = ({ suggestions, onSuggestionClick }) => {
  if (suggestions.length === 0) return null;

  return (
    <div className="mb-4 animate-in slide-in-from-bottom-2 duration-500">
      <p className="text-[8px] font-black text-blue-500/50 uppercase tracking-[0.2em] mb-2 ml-1">Suggested Searches</p>
      <div className="flex flex-wrap gap-2">
        {suggestions.map((q, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onSuggestionClick(q)}
            className="text-[10px] font-bold bg-blue-600/10 border border-blue-500/30 text-blue-400 px-3 py-1.5 rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-lg shadow-blue-900/20"
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  );
};

export default SuggestionsBar;
