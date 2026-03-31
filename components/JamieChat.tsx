'use client';

import React, { useState } from 'react';
import { useChat } from 'ai/react';
import { useTheme } from '@/context/ThemeProvider';
import IntelCard from '@/components/IntelCard';
import { FaTerminal, FaRobot, FaCogs } from 'react-icons/fa';

export default function JamieChat({ propertyData }) {
  const { branding, stagedBranding, updateBranding, stageBranding, confirmBranding, cancelStaging, isDevMode, setDevMode } = useTheme();
  const [localIntel, setLocalIntel] = useState(null);

  const handleJamieAction = async (messageContent) => {
    // PREVIEW STAGING
    if (isDevMode && messageContent.includes('---PREVIEW---')) {
      try {
        const jsonPart = messageContent.split('---PREVIEW---')[1].trim();
        const themePreview = JSON.parse(jsonPart);
        stageBranding(themePreview);
      } catch (e) {
        console.error('Logic Error: Could not parse theme preview', e);
      }
    }

    // PERMANENT UPDATE
    if (isDevMode && messageContent.includes('---JSON---')) {
      try {
        const jsonPart = messageContent.split('---JSON---')[1].trim();
        const themeUpdate = JSON.parse(jsonPart);
        updateBranding(themeUpdate);
      } catch (e) {
        console.error('Logic Error: Could not parse theme command', e);
      }
    }

    if (messageContent.includes('---INTEL---')) {
      try {
        const intelPart = messageContent.split('---INTEL---')[1].trim();
        const businessData = JSON.parse(intelPart);
        setLocalIntel(businessData);
      } catch (e) {
        console.error('Logic Error: Could not parse neighborhood intel', e);
      }
    }
  };

  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: '/api/chat',
    body: {
      propertyData,
      isDevMode
    },
    onFinish: (message) => {
      handleJamieAction(message.content);
    },
  });

  return (
    <div className="fixed bottom-5 right-5 w-96 z-50 flex flex-col gap-4 animate-in slide-in-from-bottom-10 duration-500">
      {/* Dev Mode Toggle */}
      <button 
        onClick={() => setDevMode(!isDevMode)}
        className={`group relative flex items-center justify-center gap-2 py-2 px-4 rounded-full text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-500 overflow-hidden ${
          isDevMode 
            ? 'bg-orange-500 text-white shadow-[0_0_20px_rgba(249,115,22,0.4)] scale-105' 
            : 'bg-slate-900/80 text-slate-400 border border-white/10 backdrop-blur-md'
        }`}
      >
        <div className={`absolute inset-0 bg-white/20 -translate-x-full group-hover:translate-x-0 transition-transform duration-500`} />
        <FaTerminal className={isDevMode ? 'animate-pulse' : ''} /> 
        <span className="relative">{isDevMode ? 'Dev Mode: Active' : 'Dev Mode: Off'}</span>
      </button>

      {localIntel && (
        <div className="animate-in fade-in zoom-in duration-500">
          <IntelCard 
            businessName="Sunset Grill" 
            items={localIntel} 
            onAction={() => alert('Order sent to the Station!')}
          />
        </div>
      )}

      {stagedBranding && (
        <div className="bg-slate-900 border-2 border-orange-500 rounded-[2rem] p-6 shadow-2xl animate-in zoom-in duration-500">
          <div className="flex items-center gap-3 mb-4 text-orange-500">
            <FaCogs className="animate-spin" />
            <h4 className="font-black uppercase text-xs tracking-widest">Staging Preview Active</h4>
          </div>
          <p className="text-slate-300 text-[10px] uppercase font-bold mb-6 leading-relaxed">
            Jamie has prepared a grid manipulation. Would you like to deploy these coordinates to the global branding?
          </p>
          <div className="grid grid-cols-2 gap-3">
            <button 
              onClick={cancelStaging}
              className="py-3 bg-slate-800 text-slate-400 rounded-xl text-[10px] font-black uppercase hover:bg-slate-700 transition-all"
            >
              Discard
            </button>
            <button 
              onClick={confirmBranding}
              className="py-3 bg-orange-500 text-white rounded-xl text-[10px] font-black uppercase shadow-lg shadow-orange-500/20 hover:scale-105 transition-all"
            >
              Confirm Vibe
            </button>
          </div>
        </div>
      )}

      <div className="bg-slate-900/90 backdrop-blur-2xl rounded-[2rem] shadow-[0_20px_60px_rgba(0,0,0,0.4)] border border-white/10 flex flex-col h-[550px] overflow-hidden transition-all duration-500 hover:border-blue-500/30">
        <div className="bg-gradient-to-r from-blue-600 to-blue-400 p-5 text-white flex justify-between items-center transition-all duration-500 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-md">
              <FaRobot className="text-lg" />
            </div>
            <div>
              <h3 className="font-black tracking-[0.1em] uppercase text-sm italic">Jamie Agentic UI</h3>
              <p className="text-[8px] opacity-70 font-bold uppercase tracking-widest">Protocol V4.2.0</p>
            </div>
          </div>
          <div className="relative">
            <div className="h-3 w-3 bg-green-400 rounded-full animate-ping absolute inset-0" />
            <div className="h-3 w-3 bg-green-400 rounded-full relative shadow-[0_0_10px_rgba(74,222,128,0.5)]" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide">
          {messages.map((m) => (
            <div key={m.id} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'} animate-in slide-in-from-${m.role === 'user' ? 'right' : 'left'}-5 duration-300`}>
              <div className={`max-w-[85%] p-4 rounded-[1.5rem] text-sm shadow-xl transition-all duration-500 hover:scale-[1.02] ${
                m.role === 'user' 
                  ? 'bg-blue-600 text-white rounded-tr-none shadow-blue-500/10 border border-white/10' 
                  : 'bg-slate-800 text-slate-100 border border-white/5 rounded-tl-none shadow-black/20'
              }`}>
                <p className="leading-relaxed font-medium">{m.content.split('---')[0]}</p>
              </div>
              
              {/* Debug Metadata Inspector */}
              {isDevMode && m.role === 'assistant' && m.content.includes('---') && (
                <div className="mt-2 p-3 bg-slate-950/80 rounded-xl border border-blue-500/30 font-mono text-[9px] text-blue-300/80 max-w-[90%] overflow-x-auto">
                  <div className="flex items-center gap-2 mb-1 text-blue-400 font-black uppercase tracking-widest">
                    <FaCogs /> [LOG_INTERCEPTED]
                  </div>
                  <pre className="whitespace-pre-wrap">{m.content.split('---').slice(1).join('---')}</pre>
                </div>
              )}
            </div>
          ))}
          {isLoading && (
            <div className="flex items-center gap-3 text-[10px] font-black text-blue-400 uppercase tracking-widest animate-pulse">
              <div className="flex gap-1">
                <div className="w-1 h-1 bg-blue-400 rounded-full animate-bounce" />
                <div className="w-1 h-1 bg-blue-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                <div className="w-1 h-1 bg-blue-400 rounded-full animate-bounce [animation-delay:0.4s]" />
              </div>
              Jamie is analyzing the grid...
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="p-6 bg-slate-950/50 border-t border-white/5">
          {isDevMode && (
            <div className="mb-4 flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {[
                'Dark Mode', 'Cyberpunk', 'Tactical', 'Minimalist', 'Moody', 
                'Forest', 'Sunset', 'Oceanic', 'Luxury', 'Terminal',
                'Neon', 'Desert', 'Lavender', 'Industrial', 'Sky',
                'Solar', 'Glacier', 'Vintage', 'Midnight', 'Volcano',
                'Zen', 'Mars', 'Deep Sea', 'Gold Rush', 'Cyber Lime',
                'Aurora', 'Coffee', 'Vampire', 'Holographic', 'Carbon',
                'Cyber Purple', 'Nordic', 'Blood Moon', 'Mint', 'High-Rise'
              ].map((vibe) => (
                <button
                  key={vibe}
                  type="button"
                  onClick={() => handleInputChange({ target: { value: `Jamie, switch to ${vibe} vibe.` } })}
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
              placeholder={isDevMode ? "EXECUTE_VIBE_CHANGE..." : "COMMAND_JAMIE_AI..."}
              onChange={handleInputChange}
            />
            <button 
              type="submit"
              className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-blue-500 hover:text-blue-400 transition-colors"
            >
              <FaCogs className={isLoading ? 'animate-spin' : ''} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
