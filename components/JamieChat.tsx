'use client';

import React, { useState, useEffect } from 'react';
import { useChat } from 'ai/react';
import { useTheme } from '@/context/ThemeProvider';
import { memoryBridge } from '@/lib/memory_bridge';
import { speak } from '@/lib/core/tts';

// Refactored Sub-components
import JamieChatMinimized from './chat/JamieChatMinimized';
import JamieChatHeader from './chat/JamieChatHeader';
import JamieChatMessageList from './chat/JamieChatMessageList';
import JamieChatInput from './chat/JamieChatInput';
import JamieDevControls from './chat/JamieDevControls';
import JamieIntelCard from './chat/JamieIntelCard';
import JamieBrandingConfirm from './chat/JamieBrandingConfirm';

export default function JamieChat({ propertyData }) {
  const { 
    stagedBranding, 
    confirmBranding, 
    cancelStaging, 
    isDevMode, 
    setDevMode,
    isLefthandMode,
    setLefthandMode
  } = useTheme();

  const [mounted, setMounted] = useState(false);
  const [localIntel, setLocalIntel] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isMinimized, setIsMinimized] = useState(false);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [tempInput, setTempInput] = useState('');

  // Recognition Context for returning users - safely handled after mount
  const [memoryContext, setMemoryContext] = useState<any>(null);
  const [persistentMessages, setPersistentMessages] = useState<any[]>([]);

  useEffect(() => {
    setMounted(true);
    setMemoryContext(memoryBridge.getGreetingContext());
    setPersistentMessages(memoryBridge.getHistory());
  }, []);

  const handleAction = (messageContent: string) => {
    if (!messageContent || typeof messageContent !== 'string') return;
    
    // Log assistant message to memory
    memoryBridge.logInteraction({ role: 'assistant', content: messageContent, timestamp: new Date().toISOString() });

    // TTS: Speak the message, but strip tags first
    const cleanText = messageContent.replace(/\[\[([A-Z]+):(\{.*?\}|\[.*?\])\]\]/g, '').trim();
    if (cleanText) speak(cleanText);

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
    initialMessages: persistentMessages,
    onFinish: (message) => handleAction(message.content),
  });

  // Re-sync messages when persistentMessages load (to prevent loss of history during hydration)
  useEffect(() => {
    if (mounted && persistentMessages.length > 0 && messages.length === 0) {
      setMessages(persistentMessages);
    }
  }, [mounted, persistentMessages, setMessages]);

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

    // Log user interaction
    memoryBridge.logInteraction({ role: 'user', content: input, timestamp: new Date().toISOString() });

    try {
      const shieldResponse = await fetch('/api/jamie/shield', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: input }),
      });
      const security = await shieldResponse.json();
      if (security.status === 'BLOCKED') {
        const assistantMsg = `⚠️ [NOTICE]: ${security.message}`;
        setMessages([...messages, { id: Date.now().toString(), role: 'user', content: input }, { id: (Date.now() + 1).toString(), role: 'assistant', content: assistantMsg }]);
        memoryBridge.logInteraction({ role: 'assistant', content: assistantMsg, timestamp: new Date().toISOString() });
        handleInputChange({ target: { value: '' } } as any);
        return;
      }
      if (security.status === 'RESOLVED_BY_MINI') {
        const assistantMsg = security.response;
        setMessages([...messages, { id: Date.now().toString(), role: 'user', content: input }, { id: (Date.now() + 1).toString(), role: 'assistant', content: assistantMsg }]);
        memoryBridge.logInteraction({ role: 'assistant', content: assistantMsg, timestamp: new Date().toISOString() });
        handleInputChange({ target: { value: '' } } as any);
        return;
      }
      originalHandleSubmit(e);
    } catch (error) {
      console.error('Submission Error:', error);
      originalHandleSubmit(e);
    }
  };

  if (!mounted) return null;

  if (isMinimized) {
    return <JamieChatMinimized onOpen={() => setIsMinimized(false)} isLefthandMode={isLefthandMode} />;
  }

  return (
    <div className={`fixed bottom-5 ${isLefthandMode ? 'left-5' : 'right-5'} z-50 flex flex-col gap-4 transition-all duration-500 w-96`}>
      <JamieDevControls isActive={isDevMode} onToggle={setDevMode} />

      {localIntel && (
        <div className="animate-in fade-in zoom-in duration-500">
          <JamieIntelCard businessName="Sunset Grill" items={localIntel} onAction={() => alert('Order sent.')} />
        </div>
      )}

      {stagedBranding && (
        <JamieBrandingConfirm onCancel={cancelStaging} onConfirm={confirmBranding} />
      )}

      <div className="bg-slate-900/90 backdrop-blur-2xl rounded-[2rem] shadow-[0_20px_60px_rgba(0,0,0,0.4)] border border-white/10 flex flex-col h-[550px] overflow-hidden transition-all duration-500 hover:border-blue-500/30 animate-in zoom-in-95 duration-300">
        <JamieChatHeader 
          onMinimize={() => setIsMinimized(true)} 
          isLefthandMode={isLefthandMode} 
          onToggleLefthand={() => setLefthandMode(!isLefthandMode)} 
        />

        <JamieChatMessageList 
          messages={messages} 
          isDevMode={isDevMode} 
          analytics={analytics} 
          isLoading={isLoading} 
        />

        <JamieChatInput 
          input={input}
          handleInputChange={handleInputChange}
          handleSubmit={handleSubmit}
          handleKeyDown={handleKeyDown}
          isLoading={isLoading}
          suggestions={suggestions}
          onSelectSuggestion={(q) => { append({ role: 'user', content: q }); setSuggestions([]); }}
          isDevMode={isDevMode}
        />
      </div>
    </div>
  );
}
