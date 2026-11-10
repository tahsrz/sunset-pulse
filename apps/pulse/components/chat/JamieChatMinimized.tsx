'use client';

import React from 'react';
import { Bot } from 'lucide-react';

interface JamieChatMinimizedProps {
  onOpen: () => void;
  isLefthandMode: boolean;
  assistantName?: string;
  listeningStatus?: string;
  liveCaption?: string;
}

const JamieChatMinimized: React.FC<JamieChatMinimizedProps> = ({
  onOpen,
  isLefthandMode,
  assistantName = 'Jamie',
  listeningStatus,
  liveCaption,
}) => {
  const hasTranscript = Boolean(listeningStatus === 'listening' || liveCaption);

  return (
    <div className={`fixed bottom-4 ${isLefthandMode ? 'left-4 sm:left-0' : 'right-4 sm:right-0'} z-40 transition-all duration-500 sm:bottom-auto sm:top-1/2 sm:-translate-y-1/2`}>
      {hasTranscript ? (
        <div className="mb-2 max-w-56 border-l-2 border-emerald-300 bg-slate-950/90 px-3 py-2" aria-live="polite" aria-label="Jamie live transcript">
          <p className="text-xs leading-5 text-slate-200">{liveCaption || 'Listening...'}</p>
        </div>
      ) : null}
      <button
        type="button"
        onClick={onOpen}
        aria-label={`Open ${assistantName}`}
        className="relative z-10 flex h-11 w-11 items-center justify-center rounded border border-slate-500 bg-[#121923] text-slate-100 hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-100 sm:h-40 sm:w-12 sm:flex-col sm:gap-3"
      >
        <Bot aria-hidden="true" size={18} />
        <span className="hidden [writing-mode:vertical-rl] rotate-180 font-mono text-xs uppercase tracking-wide sm:block">
          {assistantName}
        </span>
      </button>
    </div>
  );
};

export default JamieChatMinimized;
