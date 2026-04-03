'use client';

import React from 'react';
import { FaCogs } from 'react-icons/fa';

interface TelarielProps {
  message: {
    id: string;
    role: string;
    content: string;
  };
  isDevMode: boolean;
}

const cleanContent = (content: string) => {
  return content.replace(/\[\[([A-Z]+):(\{.*?\}|\[.*?\])\]\]/g, '').trim();
};

const Telariel: React.FC<TelarielProps> = ({ message, isDevMode }) => {
  const isUser = message.role === 'user';

  return (
    <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} animate-in slide-in-from-${isUser ? 'right' : 'left'}-5 duration-300`}>
      <div className={`max-w-[85%] p-4 rounded-[1.5rem] text-sm shadow-xl transition-all duration-500 hover:scale-[1.02] ${
        isUser 
          ? 'bg-blue-600 text-white rounded-tr-none border border-white/10' 
          : 'bg-slate-800 text-slate-100 border border-white/5 rounded-tl-none'
      }`}>
        <p className="leading-relaxed font-medium">{cleanContent(message.content)}</p>
      </div>
      
      {isDevMode && !isUser && message.content.includes('[[') && (
        <div className="mt-2 p-3 bg-slate-950/80 rounded-xl border border-blue-500/30 font-mono text-[9px] text-blue-300/80 max-w-[90%] overflow-x-auto">
          <div className="flex items-center gap-2 mb-1 text-blue-400 font-black uppercase tracking-widest">
            <FaCogs /> [METADATA]
          </div>
          <pre className="whitespace-pre-wrap">{message.content.match(/\[\[(.*?)\]\]/g)?.join('\n')}</pre>
        </div>
      )}
    </div>
  );
};

export default Telariel;
