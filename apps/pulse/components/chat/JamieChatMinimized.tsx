'use client';
import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { Bot, MessageSquare, Send, Sparkles, X, Minimize2, Maximize2, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function JamieChatMinimized() {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: "Hey! I'm Jamie, your AI real estate assistant. Looking for property insights, local market data, or investment calculations? How can I help today?",
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const response = await fetch('/api/jamie-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, { role: 'user', content: userMessage }],
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch response');
      }

      const data = await response.json();
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: data.reply || data.message || "I'm having trouble retrieving details right now, but feel free to ask about market trends or local listings!",
        },
      ]);
    } catch (err) {
      console.error('[JAMIE_MINIMIZED] Chat error:', err);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: "Sorry, I hit a slight bump getting that info. Give it another try in a second!",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    setMessages([
      {
        role: 'assistant',
        content: "Chat reset! What else can I assist you with today?",
      },
    ]);
  };

  if (!isOpen) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <button
          onClick={() => setIsOpen(true)}
          className="group relative flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-500 text-white shadow-[0_10px_25px_rgba(124,58,237,0.5)] transition-all duration-300 hover:scale-105 hover:shadow-[0_15px_35px_rgba(124,58,237,0.7)] active:scale-95"
          aria-label="Open Jamie AI Chat"
        >
          <div className="absolute -inset-0.5 rounded-full bg-gradient-to-r from-violet-400 to-cyan-400 opacity-0 blur transition duration-300 group-hover:opacity-75" />
          <Bot className="relative h-7 w-7 transition-transform duration-300 group-hover:rotate-12" />
          <span className="absolute -top-1 -right-1 flex h-4 w-4">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75" />
            <span className="relative inline-flex h-4 w-4 rounded-full bg-cyan-500" />
          </span>
        </button>
      </div>
    );
  }

  return (
    <div
      className={`fixed bottom-6 right-6 z-50 flex flex-col overflow-hidden rounded-2xl border border-violet-500/20 bg-[#06131d]/95 shadow-[0_20px_60px_rgba(0,0,0,0.6)] backdrop-blur-2xl transition-all duration-300 ${
        isExpanded
          ? 'h-[85vh] w-[92vw] max-w-4xl sm:w-[600px]'
          : 'h-[520px] w-[92vw] max-w-md sm:w-[380px]'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-violet-500/20 bg-gradient-to-r from-violet-900/40 via-indigo-900/30 to-[#06131d] px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-violet-600 to-cyan-400 text-white shadow-md">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white">Jamie AI</h3>
              <span className="rounded-full bg-cyan-500/20 px-2 py-0.5 text-[10px] font-semibold text-cyan-300 border border-cyan-500/30">
                Online
              </span>
            </div>
            <p className="text-[11px] text-slate-400">Sunset Pulse Real Estate Copilot</p>
          </div>
        </div>

        <div className="flex items-center gap-1 text-slate-400">
          <button
            onClick={handleClear}
            className="rounded-lg p-1.5 hover:bg-white/10 hover:text-white transition"
            title="Clear Chat"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="rounded-lg p-1.5 hover:bg-white/10 hover:text-white transition"
            title={isExpanded ? 'Minimize Window' : 'Expand Window'}
          >
            {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="rounded-lg p-1.5 hover:bg-white/10 hover:text-white transition"
            title="Close Chat"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin scrollbar-thumb-violet-500/20">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-br-none shadow-md'
                  : 'bg-white/[0.07] text-slate-200 border border-white/10 rounded-bl-none'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="flex items-center gap-2 rounded-2xl rounded-bl-none border border-white/10 bg-white/[0.07] px-3.5 py-2.5 text-xs text-slate-400">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-cyan-400" />
              Jamie is thinking...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Launch Link */}
      <div className="border-t border-white/5 bg-black/20 px-4 py-1.5 text-center">
        <Link
          href="/jamie-chat"
          className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-violet-400 hover:text-violet-300 transition"
        >
          <MessageSquare className="h-3 w-3" />
          Open Full Jamie Suite & Workspace
        </Link>
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="border-t border-white/10 bg-[#040d14] p-3">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask Jamie anything about homes, leads, market..."
            className="flex-1 rounded-xl border border-white/10 bg-white/[0.05] px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
          />
          <Button
            type="submit"
            disabled={isLoading || !input.trim()}
            size="sm"
            className="h-8 w-8 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-500 p-0 text-white hover:opacity-90 disabled:opacity-50"
          >
            <Send className="h-3.5 w-3.5" />
          </Button>
        </div>
      </form>
    </div>
  );
}