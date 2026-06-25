'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/context/ThemeProvider';
import { useAuth } from '@/context/AuthContext';
import { memoryBridge } from '@/lib/memory_bridge';
import { speak } from '@/lib/core/tts';
import { getJamieDisplayContent } from '@/lib/ai/jamieResponse';

import { useVibe } from '@/context/VibeContext';

// Refactored Sub-components
import JamieChatMinimized from './chat/JamieChatMinimized';
import JamieChatHeader from './chat/JamieChatHeader';
import JamieChatMessageList from './chat/JamieChatMessageList';
import JamieChatInput from './chat/JamieChatInput';
import JamieDevControls from './chat/JamieDevControls';
import JamieIntelCard from './chat/JamieIntelCard';
import JamieBrandingConfirm from './chat/JamieBrandingConfirm';
import MlsCommandWorkspace from '@/components/idx/MlsCommandWorkspace';

const MATRIX_IDX_URL = 'https://ntrdd.mlsmatrix.com/Matrix/public/IDX.aspx?idx=22f244f9';

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  toolResults?: any[];
  tensorzero?: {
    status?: string;
    turnId?: string;
    variantName?: string;
    score?: number;
    metrics?: Record<string, number | boolean>;
  };
};

type JamieChatProps = {
  propertyData?: any;
  mode?: 'dock' | 'workspace';
  apiRoute?: string;
};

export default function JamieChat({ propertyData = null, mode = 'dock', apiRoute }: JamieChatProps) {
  const router = useRouter();
  const isWorkspace = mode === 'workspace';
  const chatApiRoute = apiRoute || (isWorkspace ? '/api/jamie/chat' : '/api/chat');
  const { user, loading: authLoading } = useAuth();
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

  const { setVibeFromContent } = useVibe();

  const [mounted, setMounted] = useState(false);
  const [localIntel, setLocalIntel] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isMinimized, setIsMinimized] = useState(true);
  const [isMlsOpen, setIsMlsOpen] = useState(false);
  const [mlsAccess, setMlsAccess] = useState<'checking' | 'allowed' | 'denied'>('checking');
  const [mlsFrameState, setMlsFrameState] = useState<'idle' | 'loading' | 'loaded'>('idle');
  const [showEmailWorkflow, setShowEmailWorkflow] = useState(false);
  const [emailSendState, setEmailSendState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [emailSendMessage, setEmailSendMessage] = useState('');
  const [emailWorkflow, setEmailWorkflow] = useState({
    to: '',
    subject: 'MLS Anchor Follow-Up',
    buyerNames: '',
    propertyAddress: '',
    notes: ''
  });
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [mlsWorkflow, setMlsWorkflow] = useState({
    locationHint: '',
    buyerNames: '',
    propertyAddress: '',
    county: ''
  });
  const [tempInput, setTempInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

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
    
    if (isWorkspace) {
      setIsMinimized(false);
      return;
    }

    const savedMinimized = localStorage.getItem('jamie_chat_minimized');
    if (savedMinimized !== null) {
      setIsMinimized(savedMinimized === 'true');
    }
  }, [isWorkspace]);

  const toggleMinimized = (val: boolean) => {
    if (isWorkspace) return;
    setIsMinimized(val);
    localStorage.setItem('jamie_chat_minimized', val.toString());
  };

  useEffect(() => {
    if (!isMlsOpen) {
      setMlsFrameState('idle');
      return;
    }

    let isCancelled = false;
    const revealTimer = window.setTimeout(() => {
      if (!isCancelled) setMlsFrameState('loaded');
    }, 4500);

    setMlsAccess(user ? 'allowed' : 'checking');
    setMlsFrameState('loading');

    fetch('/api/auth/session', { cache: 'no-store' })
      .then((response) => response.json())
      .then((body) => {
        if (isCancelled) return;
        setMlsAccess(body?.authenticated ? 'allowed' : 'denied');
      })
      .catch((error) => {
        console.error('[JAMIE_MLS] Session probe failed:', error);
        if (!isCancelled) setMlsAccess(user ? 'allowed' : 'denied');
      });

    return () => {
      isCancelled = true;
      window.clearTimeout(revealTimer);
    };
  }, [isMlsOpen, user]);


  const handleAction = async (messageContent: string) => {
    if (!messageContent || typeof messageContent !== 'string') return;

    try {
      setVibeFromContent(messageContent);
    } catch (e) {
      // safe fallback
    }

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

  const openMatrixIdx = () => {
    const opened = window.open(MATRIX_IDX_URL, '_blank', 'noopener,noreferrer');

    if (!opened) {
      window.location.assign(MATRIX_IDX_URL);
    }
  };

  const openMlsEmailDraft = () => {
    const recipient =
      emailWorkflow.to ||
      (user as any)?.email ||
      (user as any)?.user_metadata?.email ||
      '';
    if (!recipient) {
      alert('Add a recipient email first.');
      return;
    }

    const bodyLines = [
      'MLS Anchor Follow-Up',
      `Date: ${new Date().toLocaleString()}`,
      '',
      `Buyer(s): ${emailWorkflow.buyerNames || 'N/A'}`,
      `Property: ${emailWorkflow.propertyAddress || 'N/A'}`,
      '',
      'Notes:',
      emailWorkflow.notes || 'N/A',
      '',
      'Generated from Sunset Pulse MLS Anchor.'
    ];

    const href = `mailto:${encodeURIComponent(recipient)}?subject=${encodeURIComponent(
      emailWorkflow.subject || 'MLS Anchor Follow-Up'
    )}&body=${encodeURIComponent(bodyLines.join('\n'))}`;
    window.location.href = href;
  };

  const openContractSetupFromMls = () => {
    const params = new URLSearchParams();
    if (mlsWorkflow.buyerNames) params.set('buyers', mlsWorkflow.buyerNames);
    if (mlsWorkflow.propertyAddress) params.set('address', mlsWorkflow.propertyAddress);
    if (mlsWorkflow.locationHint) params.set('city', mlsWorkflow.locationHint);
    if (mlsWorkflow.county) params.set('county', mlsWorkflow.county);
    window.location.assign(`/contracts/promulgated/setup?${params.toString()}`);
  };

  const sendMlsEmailNow = async () => {
    const recipient =
      emailWorkflow.to ||
      (user as any)?.email ||
      (user as any)?.user_metadata?.email ||
      '';

    if (!recipient) {
      setEmailSendState('error');
      setEmailSendMessage('Recipient email is required.');
      return;
    }

    const text = [
      'MLS Anchor Follow-Up',
      `Date: ${new Date().toLocaleString()}`,
      '',
      `Buyer(s): ${emailWorkflow.buyerNames || 'N/A'}`,
      `Property: ${emailWorkflow.propertyAddress || 'N/A'}`,
      '',
      'Notes:',
      emailWorkflow.notes || 'N/A',
      '',
      'Generated from Sunset Pulse MLS Anchor.'
    ].join('\n');

    setEmailSendState('sending');
    setEmailSendMessage('Sending...');

    try {
      const response = await fetch('/api/communications/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: recipient,
          subject: emailWorkflow.subject || 'MLS Anchor Follow-Up',
          text
        })
      });
      const payload = await response.json();
      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error || 'Failed to send email');
      }
      setEmailSendState('sent');
      setEmailSendMessage('Email sent.');
    } catch (error: any) {
      setEmailSendState('error');
      setEmailSendMessage(error?.message || 'Failed to send email.');
    }
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement> | { target: { value: string } }) => {
    setInput(event.target.value);
  };

  const sendChatMessage = async (content: string, options?: { logUser?: boolean }) => {
    const currentInput = content.trim();
    if (!currentInput) return;

    if (options?.logUser) {
      await memoryBridge.logInteraction({ role: 'user', content: currentInput, timestamp: new Date().toISOString() });
    }

    const userMessage: ChatMessage = { id: crypto.randomUUID(), role: 'user', content: currentInput };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput('');
    setIsLoading(true);

    try {
      const chatResponse = await fetch(chatApiRoute, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: nextMessages.map(({ role, content }) => ({ role, content })),
          propertyData,
          isDevMode,
          memoryContext,
        }),
      });

      if (!chatResponse.ok) {
        throw new Error(await chatResponse.text());
      }

      const contentType = chatResponse.headers.get('content-type') || '';
      const rawAssistantResponse = contentType.includes('application/json')
        ? await chatResponse.json()
        : await chatResponse.text();
      const assistantContent = getJamieDisplayContent(rawAssistantResponse);
      const assistantToolResults = rawAssistantResponse && typeof rawAssistantResponse === 'object'
        ? rawAssistantResponse.tool_results || rawAssistantResponse.toolResults
        : undefined;
      const tensorzero = rawAssistantResponse && typeof rawAssistantResponse === 'object'
        ? rawAssistantResponse.tensorzero
        : undefined;

      setMessages([...nextMessages, {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: assistantContent,
        toolResults: assistantToolResults,
        tensorzero,
      }]);
      await handleAction(assistantContent);
    } catch (error) {
      console.error('Chat API Error:', error);
      const assistantContent = 'Assistant Logic Interrupted';
      setMessages([...nextMessages, { id: crypto.randomUUID(), role: 'assistant', content: assistantContent }]);
      await memoryBridge.logInteraction({ role: 'assistant', content: assistantContent, timestamp: new Date().toISOString() });
    } finally {
      setIsLoading(false);
    }
  };

  const originalHandleSubmit = async (_event?: React.FormEvent<HTMLFormElement>) => {
    await sendChatMessage(input);
  };

  const append = async (message: { role: 'user' | 'assistant' | 'system'; content: string }) => {
    if (message.role === 'user') {
      await sendChatMessage(message.content, { logUser: true });
      return;
    }

    setMessages([...messages, { id: crypto.randomUUID(), role: message.role, content: message.content }]);
  };

  // Sync messages from local storage or Supabase on mount
  useEffect(() => {
    if (mounted && persistentMessages.length > 0 && messages.length === 0) {
      setMessages(persistentMessages);
    }
  }, [mounted, persistentMessages, messages.length]);

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
      const shieldPayload = await shieldResponse.json();
      const security = shieldPayload?.data || shieldPayload;
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

  if (isMinimized && !isWorkspace) {
    return <JamieChatMinimized onOpen={() => toggleMinimized(false)} isLefthandMode={isLefthandMode} />;
  }

  const dockSideClass = isLefthandMode ? 'left-2 items-start sm:left-0' : 'right-2 items-end sm:right-0';
  const panelRadiusClass = isWorkspace ? 'rounded-2xl' : isLefthandMode ? 'rounded-r-2xl border-l-0' : 'rounded-l-2xl border-r-0';
  const shellClass = isWorkspace
    ? 'flex h-[calc(100vh-9rem)] min-h-[620px] w-full flex-col gap-3'
    : `fixed bottom-5 top-40 ${dockSideClass} z-40 flex w-[calc(100vw-1rem)] flex-col gap-3 transition-all duration-500 sm:w-[420px]`;
  const isCheckingMlsAccess = authLoading || mlsAccess === 'checking';
  const canViewMls = Boolean(user) || mlsAccess === 'allowed';

  return (
    <div className={shellClass}>
      <JamieDevControls isActive={isDevMode} onToggle={setDevMode} />

      {localIntel && (
        <div className="animate-in fade-in zoom-in duration-500">
          <JamieIntelCard businessName="Sunset Grill" items={localIntel} onAction={() => alert('Order sent.')} />
        </div>
      )}

      {stagedBranding && (
        <JamieBrandingConfirm onCancel={cancelStaging} onConfirm={confirmBranding} />
      )}

      <div className={`flex min-h-0 w-full flex-1 flex-col overflow-hidden border border-white/10 bg-slate-900/90 shadow-[0_20px_60px_rgba(0,0,0,0.4)] backdrop-blur-2xl transition-all duration-500 hover:border-blue-500/30 animate-in slide-in-from-bottom-4 sm:slide-in-from-right-4 ${panelRadiusClass}`}>
        <JamieChatHeader 
          onMinimize={() => isWorkspace ? router.push('/') : toggleMinimized(true)} 
          isMlsOpen={isMlsOpen}
          onToggleMls={() => setIsMlsOpen((value) => !value)}
          isLefthandMode={isLefthandMode} 
          onToggleLefthand={() => setLefthandMode(!isLefthandMode)} 
          isVoiceEnabled={isVoiceEnabled}
          onToggleVoice={() => setVoiceEnabled(!isVoiceEnabled)}
          isWorkspace={isWorkspace}
          onMaximize={() => {
            if (!isWorkspace) router.push('/jamie-chat');
          }}
        />

        {isMlsOpen && (
          <div className="shrink-0 border-b border-white/10 bg-slate-950/70 p-3">
            <div className="mb-2 flex items-center justify-between gap-3">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.22em] text-teal-200">
                  Matrix IDX
                </p>
                <p className="text-[10px] leading-4 text-slate-400">
                  MLS search is anchored here so your page stays put.
                </p>
              </div>
              {canViewMls && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowEmailWorkflow((prev) => !prev)}
                    className="rounded-md border border-emerald-200/25 bg-emerald-200/15 px-2.5 py-1.5 text-[9px] font-black uppercase tracking-[0.16em] text-emerald-100 transition hover:bg-emerald-200/20"
                  >
                    Email
                  </button>
                  <button
                    type="button"
                    onClick={openMatrixIdx}
                    className="rounded-md border border-white/10 bg-white/10 px-2.5 py-1.5 text-[9px] font-black uppercase tracking-[0.16em] text-teal-100 transition hover:bg-white/15"
                  >
                    Open
                  </button>
                </div>
              )}
            </div>
            {showEmailWorkflow && canViewMls && (
              <div className="mb-2 rounded-lg border border-emerald-200/20 bg-emerald-900/10 p-2.5">
                <p className="text-[9px] font-black uppercase tracking-[0.18em] text-emerald-200">
                  MLS Anchor Email Workflow
                </p>
                <div className="mt-2 grid gap-2 md:grid-cols-2">
                  <input
                    type="email"
                    value={emailWorkflow.to}
                    onChange={(event) => setEmailWorkflow((prev) => ({ ...prev, to: event.target.value }))}
                    placeholder="Recipient email"
                    className="rounded-md border border-white/15 bg-slate-950/70 px-2.5 py-2 text-[10px] text-white"
                  />
                  <input
                    value={emailWorkflow.subject}
                    onChange={(event) => setEmailWorkflow((prev) => ({ ...prev, subject: event.target.value }))}
                    placeholder="Subject"
                    className="rounded-md border border-white/15 bg-slate-950/70 px-2.5 py-2 text-[10px] text-white"
                  />
                  <input
                    value={emailWorkflow.buyerNames}
                    onChange={(event) => setEmailWorkflow((prev) => ({ ...prev, buyerNames: event.target.value }))}
                    placeholder="Buyer name(s)"
                    className="rounded-md border border-white/15 bg-slate-950/70 px-2.5 py-2 text-[10px] text-white"
                  />
                  <input
                    value={emailWorkflow.propertyAddress}
                    onChange={(event) => setEmailWorkflow((prev) => ({ ...prev, propertyAddress: event.target.value }))}
                    placeholder="Property address"
                    className="rounded-md border border-white/15 bg-slate-950/70 px-2.5 py-2 text-[10px] text-white"
                  />
                </div>
                <textarea
                  value={emailWorkflow.notes}
                  onChange={(event) => setEmailWorkflow((prev) => ({ ...prev, notes: event.target.value }))}
                  placeholder="Notes to include in email"
                  className="mt-2 h-20 w-full rounded-md border border-white/15 bg-slate-950/70 px-2.5 py-2 text-[10px] text-white"
                />
                <div className="mt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={sendMlsEmailNow}
                    disabled={emailSendState === 'sending'}
                    className="mr-2 rounded-md border border-emerald-200/30 bg-emerald-200/20 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-emerald-100 disabled:opacity-60"
                  >
                    {emailSendState === 'sending' ? 'Sending...' : 'Send Now'}
                  </button>
                  <button
                    type="button"
                    onClick={openMlsEmailDraft}
                    className="rounded-md bg-emerald-300 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-slate-900"
                  >
                    Open Email Draft
                  </button>
                </div>
                {emailSendState !== 'idle' && (
                  <p className={`mt-2 text-[10px] font-bold ${emailSendState === 'sent' ? 'text-emerald-200' : emailSendState === 'error' ? 'text-rose-200' : 'text-slate-300'}`}>
                    {emailSendMessage}
                  </p>
                )}
              </div>
            )}
            {canViewMls && (
              <MlsCommandWorkspace
                locationHint={mlsWorkflow.locationHint}
                buyerNames={mlsWorkflow.buyerNames}
                propertyAddress={mlsWorkflow.propertyAddress}
                onOpenContracts={openContractSetupFromMls}
                onOpenEmail={() => setShowEmailWorkflow(true)}
              />
            )}
            {canViewMls && (
              <div className="mb-2 grid gap-2 md:grid-cols-4">
                <input
                  value={mlsWorkflow.locationHint}
                  onChange={(event) => setMlsWorkflow((prev) => ({ ...prev, locationHint: event.target.value }))}
                  placeholder="City/area context"
                  className="rounded-md border border-white/15 bg-slate-950/70 px-2.5 py-2 text-[10px] text-white"
                />
                <input
                  value={mlsWorkflow.buyerNames}
                  onChange={(event) => setMlsWorkflow((prev) => ({ ...prev, buyerNames: event.target.value }))}
                  placeholder="Buyer name(s)"
                  className="rounded-md border border-white/15 bg-slate-950/70 px-2.5 py-2 text-[10px] text-white"
                />
                <input
                  value={mlsWorkflow.propertyAddress}
                  onChange={(event) => setMlsWorkflow((prev) => ({ ...prev, propertyAddress: event.target.value }))}
                  placeholder="Property address"
                  className="rounded-md border border-white/15 bg-slate-950/70 px-2.5 py-2 text-[10px] text-white"
                />
                <input
                  value={mlsWorkflow.county}
                  onChange={(event) => setMlsWorkflow((prev) => ({ ...prev, county: event.target.value }))}
                  placeholder="County"
                  className="rounded-md border border-white/15 bg-slate-950/70 px-2.5 py-2 text-[10px] text-white"
                />
              </div>
            )}
            {isCheckingMlsAccess ? (
              <div className="flex h-72 items-center justify-center rounded-lg border border-white/10 bg-slate-900 text-[10px] font-black uppercase tracking-[0.2em] text-teal-200">
                Checking Access
              </div>
            ) : canViewMls ? (
              <div className="relative h-72 overflow-hidden rounded-lg border border-white/10 bg-white">
                {mlsFrameState !== 'loaded' && (
                  <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-950 text-center">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-teal-200">
                      Loading Matrix IDX
                    </p>
                    <p className="mt-2 max-w-52 text-[10px] leading-4 text-slate-400">
                      If the frame stays blank, use Open to launch Matrix directly.
                    </p>
                  </div>
                )}
                <iframe
                  src={MATRIX_IDX_URL}
                  title="NTREIS Matrix IDX listing search"
                  className="h-full w-full"
                  frameBorder="0"
                  marginWidth={0}
                  marginHeight={0}
                  loading="eager"
                  allow="geolocation; fullscreen"
                  allowFullScreen
                  onLoadCapture={() => setMlsFrameState('loaded')}
                  onLoad={() => setMlsFrameState('loaded')}
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
            ) : (
              <div className="rounded-lg border border-teal-100/20 bg-slate-900 p-5 text-center">
                <p className="text-sm font-bold text-white">Log in to view MLS listings.</p>
                <p className="mt-2 text-xs leading-5 text-slate-400">
                  Matrix IDX search is available to authenticated Sunset Pulse users.
                </p>
                <Link
                  href="/login?redirect=/idx"
                  className="mt-4 inline-flex rounded-md border border-teal-200/25 bg-teal-200/15 px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-teal-100 transition hover:bg-teal-200/20"
                >
                  Log In
                </Link>
              </div>
            )}
          </div>
        )}

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
