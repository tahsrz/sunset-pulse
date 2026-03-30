'use client';

import React, { useState } from 'react';
import { useChat } from 'ai/react';
import { useTheme } from '@/context/ThemeProvider';
import IntelCard from '@/components/IntelCard';
import { FaTerminal, FaRobot, FaCogs } from 'react-icons/fa';

export default function JamieChat({ propertyData }) {
  const { branding, updateBranding, isDevMode, setDevMode } = useTheme();
  const [localIntel, setLocalIntel] = useState(null);

  const handleJamieAction = async (messageContent) => {
    // Only allow UI changes if Dev Mode is active
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
    <div className="fixed bottom-5 right-5 w-96 z-50 flex flex-col gap-4">
      {/* Dev Mode Toggle */}
      <button 
        onClick={() => setDevMode(!isDevMode)}
        className={`flex items-center justify-center gap-2 py-1 px-3 rounded-full text-[10px] font-bold uppercase tracking-tighter transition-all ${
          isDevMode ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20' : 'bg-slate-800 text-slate-400'
        }`}
      >
        <FaTerminal /> {isDevMode ? 'Dev Mode: Active' : 'Dev Mode: Off'}
      </button>

      {localIntel && (
        <IntelCard 
          businessName="Sunset Grill" 
          items={localIntel} 
          onAction={() => alert('Order sent to the Station!')}
        />
      )}

      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col h-[500px] overflow-hidden">
        <div className="bg-[var(--primary-color)] p-4 text-white flex justify-between items-center transition-colors duration-500">
          <div className="flex items-center gap-2">
            <FaRobot />
            <h3 className="font-bold tracking-tighter uppercase">Jamie Agentic UI</h3>
          </div>
          <div className="h-2 w-2 bg-green-400 rounded-full animate-pulse" />
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
          {messages.map((m) => (
            <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] p-3 rounded-2xl text-sm shadow-sm ${
                m.role === 'user' 
                  ? 'bg-[var(--primary-color)] text-white rounded-tr-none' 
                  : 'bg-white text-gray-800 border border-gray-100 rounded-tl-none'
              } transition-colors duration-500`}>
                {m.content.split('---')[0]}
              </div>
            </div>
          ))}
          {isLoading && <div className="text-xs text-gray-400 animate-pulse">Jamie is analyzing the grid...</div>}
        </div>

        <form onSubmit={handleSubmit} className="p-4 bg-white border-t border-gray-100">
          <input
            className="w-full p-3 bg-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)] transition-all"
            value={input}
            placeholder={isDevMode ? "Tell Jamie to change the vibe..." : "Ask Jamie about properties..."}
            onChange={handleInputChange}
          />
        </form>
      </div>
    </div>
  );
}
