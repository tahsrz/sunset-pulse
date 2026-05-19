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

export default function JamieChat({ propertyData = null }: { propertyData?: any }) {
  const { 
    stagedBranding, 
    confirmBranding, 
    cancelStaging, 
    isDevMode, 
    setDevMode,
    isLefthandMode,
    setLefthandMode,
    isVoiceEnabled,
    setVoiceEnabled
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
    
    // Hydrate history from Supabase for cross-device persistence
    const hydrateHistory = async () => {
      const history = await memoryBridge.loadInteractions();
      setPersistentMessages(history);
    };
    hydrateHistory();
    
    // Load minimized state from localStorage
    const savedMinimized = localStorage.getItem('jamie_chat_minimized');
    if (savedMinimized !== null) {
      setIsMinimized(savedMinimized === 'true');
    }
  }, []);

  const toggleMinimized = (val: boolean) => {
    setIsMinimized(val);
    localStorage.setItem('jamie_chat_minimized', val.toString());
  };

  const handleAction = async (messageContent: string) => {
    if (!messageContent || typeof messageContent !== 'string') return;
    
    // Log assistant message to memory
    await memoryBridge.logInteraction({ role: 'assistant', content: messageContent, timestamp: new Date().toISOString() });

    // TTS: Speak the message, but strip tags first
    const cleanText = messageContent.replace(/\[\[([A-Z]+):(\{.*?\}|\[.*?\])\]\]/g, '').trim();
    if (cleanText && isVoiceEnabled) speak(cleanText);

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
    onFinish: async (message) => {
      await handleAction(message.content);
    },
  });

  // Sync messages from local storage or Supabase on mount
  useEffect(() => {
    if (mounted && persistentMessages.length > 0 && messages.length === 0) {
      setMessages(persistentMessages);
    }
  }, [mounted, persistentMessages, setMessages, messages.length]);

  const userMessages = React.useMemo(() => 
    messages.filter(m => m.role === 'user').map(m => m.content),
    [messages]
  );

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
    const currentInput = input;
    setHistoryIndex(-1);

    // Log user interaction BEFORE sending
    await memoryBridge.logInteraction({ role: 'user', content: currentInput, timestamp: new Date().toISOString() });

    try {
      const shieldResponse = await fetch('/api/jamie/shield', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: currentInput }),
      });
      const security = await shieldResponse.json();
      if (security.status === 'BLOCKED') {
        const assistantMsg = `⚠️ [NOTICE]: ${security.message}`;
        setMessages([...messages, { id: Date.now().toString(), role: 'user', content: currentInput }, { id: (Date.now() + 1).toString(), role: 'assistant', content: assistantMsg }]);
        memoryBridge.logInteraction({ role: 'assistant', content: assistantMsg, timestamp: new Date().toISOString() });
        setInput('');
        return;
      }
      if (security.status === 'RESOLVED_BY_MINI') {
        const assistantMsg = security.response;
        setMessages([...messages, { id: Date.now().toString(), role: 'user', content: currentInput }, { id: (Date.now() + 1).toString(), role: 'assistant', content: assistantMsg }]);
        memoryBridge.logInteraction({ role: 'assistant', content: assistantMsg, timestamp: new Date().toISOString() });
        setInput('');
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
    return <JamieChatMinimized onOpen={() => toggleMinimized(false)} isLefthandMode={isLefthandMode} />;
  }

  const dockSideClass = isLefthandMode ? 'left-0 items-start' : 'right-0 items-end';
  const panelRadiusClass = isLefthandMode ? 'rounded-r-2xl border-l-0' : 'rounded-l-2xl border-r-0';

  return (
    <div className={`fixed bottom-5 top-24 ${dockSideClass} z-50 flex w-[calc(100vw-1rem)] flex-col gap-3 transition-all duration-500 sm:w-[420px]`}>
      <JamieDevControls isActive={isDevMode} onToggle={setDevMode} />

      {localIntel && (
        <div className="animate-in fade-in zoom-in duration-500">
          <JamieIntelCard businessName="Sunset Grill" items={localIntel} onAction={() => alert('Order sent.')} />
        </div>
      )}

      {stagedBranding && (
        <JamieBrandingConfirm onCancel={cancelStaging} onConfirm={confirmBranding} />
      )}

      <div className={`flex min-h-0 w-full flex-1 flex-col overflow-hidden border border-white/10 bg-slate-900/[0.92] shadow-[0_20px_60px_rgba(0,0,0,0.4)] backdrop-blur-2xl transition-all duration-500 hover:border-blue-500/30 animate-in slide-in-from-bottom-4 sm:slide-in-from-right-4 ${panelRadiusClass}`}>
        <JamieChatHeader 
          onMinimize={() => toggleMinimized(true)} 
          isLefthandMode={isLefthandMode} 
          onToggleLefthand={() => setLefthandMode(!isLefthandMode)} 
          isVoiceEnabled={isVoiceEnabled}
          onToggleVoice={() => setVoiceEnabled(!isVoiceEnabled)}
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
