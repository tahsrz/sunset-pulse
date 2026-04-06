'use client';

import React, { useState } from 'react';
import { useChat } from 'ai/react';
import { useTheme } from '@/context/ThemeProvider';
import IntelCard from '@/components/IntelCard';
import Telariel from '@/components/Telariel';
import Makiel from '@/components/Makiel';
import Suriel from '@/components/Suriel';
import Zakariel from '@/components/Zakariel';
import { FaRobot, FaCogs, FaMinus } from 'react-icons/fa';
import { memoryBridge } from '@/lib/memory_bridge';

export default function JamieChat({ propertyData }) {
  const { stagedBranding, confirmBranding, cancelStaging, isDevMode, setDevMode } = useTheme();
  const [localIntel, setLocalIntel] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isMinimized, setIsMinimized] = useState(false);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [tempInput, setTempInput] = useState('');

  // Recognition Context for returning users
  const memoryContext = memoryBridge.getGreetingContext();

  const handleAction = (messageContent: string) => {
    const tagRegex = /\[\[([A-Z]+):(\{.*?\}|\[.*?\])\]\]/g;
    let match;
    while ((match = tagRegex.exec(messageContent)) !== null) {
      const [_, tag, jsonStr] = match;
      try {
        const data = JSON.parse(jsonStr);
        switch (tag) {
          case 'THEME': break;
          case 'INTEL': setLocalIntel(data); break;
          case 'SUGGESTIONS': setSuggestions(data); break;
          case 'ANALYTICS': setAnalytics(data); break;
        }

        // Persist highlights if significant action detected
        if (tag === 'INTEL' || tag === 'ANALYTICS') {
          memoryBridge.persistSessionHighlights(`Viewed ${tag}`, propertyData?.name);
        }
      } catch (e) {
        console.error(`Processing Error [${tag}]:`, e);
      }
    }
  };

  const { messages, input, setInput, handleInputChange, handleSubmit: originalHandleSubmit, isLoading, append, setMessages } = useChat({
    api: '/api/chat',
    body: { propertyData, isDevMode, memoryContext },
    onFinish: (message) => handleAction(message.content),
  });

  const userMessages = messages.filter(m => m.role === 'user').map(m => m.content);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp') {
      if (userMessages.length === 0) return;
      e.preventDefault();
      
      let newIndex;
      if (historyIndex === -1) {
        setTempInput(input);
        newIndex = userMessages.length - 1;
      } else {
        newIndex = Math.max(0, historyIndex - 1);
      }
      
      setHistoryIndex(newIndex);
      setInput(userMessages[newIndex]);
    } else if (e.key === 'ArrowDown') {
      if (historyIndex === -1) return;
      e.preventDefault();

      const newIndex = historyIndex + 1;
      if (newIndex >= userMessages.length) {
        setHistoryIndex(-1);
        setInput(tempInput);
      } else {
        setHistoryIndex(newIndex);
        setInput(userMessages[newIndex]);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim()) return;
    setHistoryIndex(-1);
    try {
      const shieldResponse = await fetch('/api/jamie/shield', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: input }),
      });
      const security = await shieldResponse.json();
      if (security.status === 'BLOCKED') {
        setMessages([...messages, { id: Date.now().toString(), role: 'user', content: input }, { id: (Date.now() + 1).toString(), role: 'assistant', content: `⚠️ [NOTICE]: ${security.message}` }]);
        handleInputChange({ target: { value: '' } } as any);
        return;
      }
      if (security.status === 'RESOLVED_BY_MINI') {
        setMessages([...messages, { id: Date.now().toString(), role: 'user', content: input }, { id: (Date.now() + 1).toString(), role: 'assistant', content: security.response }]);
        handleInputChange({ target: { value: '' } } as any);
        return;
      }
      originalHandleSubmit(e);
    } catch (error) {
      console.error('Submission Error:', error);
      originalHandleSubmit(e);
    }
  };

  return (
    <div className={`fixed bottom-5 right-5 z-50 flex flex-col gap-4 transition-all duration-500 ${isMinimized ? 'w-16 h-16' : 'w-96'}`}>
      {!isMinimized && <Makiel isActive={isDevMode} onToggle={setDevMode} />}

      {localIntel && !isMinimized && (
        <div className="animate-in fade-in zoom-in duration-500">
          <IntelCard businessName="Sunset Grill" items={localIntel} onAction={() => alert('Order sent.')} />
        </div>
      )}

      {stagedBranding && !isMinimized && (
        <Suriel onCancel={cancelStaging} onConfirm={confirmBranding} />
      )}

      {isMinimized ? (
        <button
          onClick={() => setIsMinimized(false)}
          className="w-16 h-16 bg-gradient-to-br from-blue-600 to-blue-400 rounded-full flex items-center justify-center text-white shadow-2xl hover:scale-110 transition-all duration-300 border-2 border-white/20 relative"
        >
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-slate-900 animate-pulse" />
          <FaRobot className="text-2xl" />
        </button>
      ) : (
        <div className="bg-slate-900/90 backdrop-blur-2xl rounded-[2rem] shadow-[0_20px_60px_rgba(0,0,0,0.4)] border border-white/10 flex flex-col h-[550px] overflow-hidden transition-all duration-500 hover:border-blue-500/30 animate-in zoom-in-95 duration-300">
          <div className="bg-gradient-to-r from-blue-600 to-blue-400 p-5 text-white flex justify-between items-center shadow-lg">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg backdrop-blur-md"><FaRobot className="text-lg" /></div>
              <div>
                <h3 className="font-black tracking-[0.1em] uppercase text-sm italic">Jamie</h3>
                <p className="text-[8px] opacity-70 font-bold uppercase tracking-widest">Active Session</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button onClick={() => setIsMinimized(true)} className="p-2 hover:bg-white/20 rounded-lg transition-colors"><FaMinus className="text-xs" /></button>
              <div className="h-3 w-3 bg-green-400 rounded-full shadow-[0_0_10px_rgba(74,222,128,0.5)]" />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide">
            {messages.map((m) => (
              <Telariel key={m.id} message={m} isDevMode={isDevMode} />
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

          <form onSubmit={handleSubmit} className="p-6 bg-slate-950/50 border-t border-white/5">
            <Zakariel items={suggestions} onSelect={(q) => { append({ role: 'user', content: q }); setSuggestions([]); }} />

            {isDevMode && (
              <div className="mb-4 flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {['Dark Mode', 'Cyberpunk', 'Tactical', 'Minimalist', 'Moody', 'Forest', 'Sunset', 'Oceanic', 'Luxury', 'Terminal'].map((vibe) => (
                  <button key={vibe} type="button" onClick={() => handleInputChange({ target: { value: `Switch to ${vibe} theme.` } } as any)} className="whitespace-nowrap bg-blue-500/10 border border-blue-500/30 text-[9px] font-black uppercase tracking-widest text-blue-400 px-3 py-1.5 rounded-full hover:bg-blue-500 hover:text-white transition-all">{vibe}</button>
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
              <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-blue-500 hover:text-blue-400 transition-colors"><FaCogs className={isLoading ? 'animate-spin' : ''} /></button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
