'use client';

import React from 'react';
import JamieMessage from './JamieMessage';

interface JamieChatMessageListProps {
  messages: any[];
  isDevMode: boolean;
  analytics: any;
  isLoading: boolean;
}

const JamieChatMessageList: React.FC<JamieChatMessageListProps> = ({
  messages,
  isDevMode,
  analytics,
  isLoading,
}) => {
  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide">
      {messages.map((m) => (
        <JamieMessage key={m.id} message={m} isDevMode={isDevMode} />
      ))}
      
      {analytics && isDevMode && (
        <div className="mx-6 p-3 bg-blue-500/10 border border-blue-500/30 rounded-xl flex items-center justify-between animate-in fade-in slide-in-from-top-2">
          <span className="text-[10px] font-black uppercase text-blue-400 tracking-widest">Score: {analytics.leadScore}</span>
          <span className="text-[10px] font-black uppercase text-blue-400 tracking-widest">Intent: {analytics.intent}</span>
        </div>
      )}
      
      {isLoading && (
        <div className="flex items-center gap-3 text-[10px] font-black text-blue-400 uppercase tracking-widest animate-pulse">
          Processing...
        </div>
      )}
    </div>
  );
};

export default JamieChatMessageList;
