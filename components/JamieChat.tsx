'use client';

import React, { useState, useEffect } from 'react';
import { useChat } from 'ai/react'; // Assumes Vercel AI SDK
import { useTheme } from '@/context/ThemeProvider';
import IntelCard from '@/components/IntelCard';

export default function JamieChat() {
  const { branding, updateBranding } = useTheme();
  const [localIntel, setLocalIntel] = useState<any>(null);

  // --- 1. THE MACHINE LEARNING COMMAND CENTER ---
  const handleJamieAction = async (messageContent: string) => {
    // A. Handle Theme/UI Changes (Codebase Mode)
    if (messageContent.includes('---JSON---')) {
      try {
        const jsonPart = messageContent.split('---JSON---')[1].trim();
        const themeUpdate = JSON.parse(jsonPart);
        
        // Instant UI Update (Optimistic)
        updateBranding(themeUpdate);

        // Sync with MongoDB for persistence
        await fetch('/api/agent/update-config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ agentId: 'taz-realty-001', branding: themeUpdate }),
        });
      } catch (e) {
        console.error("ML Logic Error: Could not parse theme command", e);
      }
    }

    // B. Handle Neighborhood Intelligence (The Grill Moat)
    if (messageContent.includes('---INTEL---')) {
      try {
        const intelPart = messageContent.split('---INTEL---')[1].trim();
        const businessData = JSON.parse(intelPart);
        setLocalIntel(businessData);
      } catch (e) {
        console.error("ML Logic Error: Could not parse neighborhood intel", e);
      }
    }
  };

  // --- 2. THE AI SDK INTEGRATION ---
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: '/api/chat',
    onFinish: (message) => {
      handleJamieAction(message.content);
    },
  });

  return (
    <div className="fixed bottom-5 right-5 w-96 z-50 flex flex-col gap-4">
      
      {/* LOCAL INTEL OVERLAY (Appears when Jamie triggers it) */}
      {localIntel && (
        <IntelCard 
          businessName="Sunset Grill" 
          items={localIntel} 
          onAction={() => alert("Order sent to the Station!")}
        />
      )}

      {/* CHAT INTERFACE */}
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col h-[500px] overflow-hidden">
        <div className="bg-[var(--primary-color)] p-4 text-white flex justify-between items-center">
          <h3 className="font-bold tracking-tighter uppercase">Jamie Agentic UI</h3>
          <div className="h-2 w-2 bg-green-400 rounded-full animate-pulse" />
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
          {messages.map((m) => (
            <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] p-3 rounded-2xl text-sm shadow-sm ${
                m.role === 'user' 
                  ? 'bg-[var(--primary-color)] text-white rounded-tr-none' 
                  : 'bg-white text-gray-800 border border-gray-100 rounded-tl-none'
              }`}>
                {/* We strip the JSON tags from the visible chat for a clean UI */}
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
            placeholder="Tell Jamie to change the vibe..."
            onChange={handleInputChange}
          />
        </form>
      </div>
    </div>
  );
}