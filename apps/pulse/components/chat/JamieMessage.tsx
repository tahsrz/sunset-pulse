'use client';

import React from 'react';
import { FaCogs, FaLightbulb, FaLayerGroup } from 'react-icons/fa';

interface JamieMessageProps {
  message: {
    id: string;
    role: string;
    content: string;
  };
  isDevMode: boolean;
}

const cleanContent = (content: string) => {
  if (!content || typeof content !== 'string') return '';
  return content.replace(/\[\[([A-Z]+):(\{.*?\}|\[.*?\])\]\]/g, '').trim();
};

const JamieMessage: React.FC<JamieMessageProps> = ({ message, isDevMode }) => {
  const isUser = message.role === 'user';
  const content = message.content || '';
  const cleaned = cleanContent(content);

  const displayContent = cleaned || (isDevMode ? '[METADATA_ONLY_NODE]' : '');

  if (!displayContent && !isDevMode) return null;

  return (
    <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} animate-in slide-in-from-${isUser ? 'right' : 'left'}-5 duration-300 gap-2 mb-4`}>
      {/* User Message or Jamie's Response */}
      <div className={`max-w-[85%] p-4 rounded-[1.5rem] text-sm shadow-xl transition-all duration-500 hover:scale-[1.01] relative ${
        isUser 
          ? 'bg-blue-600 text-white rounded-tr-none border border-white/10' 
          : 'bg-slate-800 text-white border border-white/10 rounded-tl-none'
      }`}>
        {!isUser && (
          <div className="absolute -top-2 -left-2 bg-blue-500 rounded-full p-1 border border-slate-900 shadow-lg">
            <FaLightbulb size={8} className="text-white" />
          </div>
        )}
        <p className="leading-relaxed font-medium whitespace-pre-wrap">{displayContent}</p>
      </div>
      
      {!isUser && content.includes('[[') && (
        <div className="ml-2 flex flex-col gap-1.5 w-full max-w-[80%]">
          <div className="flex items-center gap-2 text-[8px] font-black uppercase text-slate-500 tracking-widest px-1">
            <FaLayerGroup size={8} /> Internal Process Chain
          </div>
          <div className="flex flex-wrap gap-2">
            {content.match(/\[\[([A-Z]+):/g)?.map((match, i) => {
              const tag = match.replace('[[', '').replace(':', '');
              return (
                <div key={i} className="px-2 py-1 bg-slate-900/50 border border-blue-500/20 rounded-lg flex items-center gap-2 group hover:border-blue-500/50 transition-colors">
                  <div className="w-1 h-1 rounded-full bg-blue-400 animate-pulse" />
                  <span className="font-mono text-[8px] text-blue-300/80">{tag}_PROCESSED</span>
                </div>
              );
            })}
          </div>
          
          {isDevMode && (
            <div className="mt-1 p-3 bg-slate-950/80 rounded-xl border border-blue-500/30 font-mono text-[9px] text-blue-300/80 overflow-x-auto">
              <div className="flex items-center gap-2 mb-1 text-blue-400 font-black uppercase tracking-widest">
                <FaCogs /> [RAW_PAYLOAD]
              </div>
              <pre className="whitespace-pre-wrap">{content.match(/\[\[(.*?)\]\]/g)?.join('\n')}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default JamieMessage;
