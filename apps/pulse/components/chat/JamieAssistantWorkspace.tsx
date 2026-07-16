'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import {
  AssistantRuntimeProvider,
  ComposerPrimitive,
  MessagePartPrimitive,
  MessagePrimitive,
  ThreadPrimitive,
  useLocalRuntime,
  useMessage,
  type ChatModelAdapter,
  type ThreadMessage
} from '@assistant-ui/react';
import { ArrowUp, Bot, Command, Loader2, Maximize2, RotateCcw, Send, Sparkles, TerminalSquare } from 'lucide-react';
import { getJamieDisplayContent } from '@/lib/ai/jamieResponse';
import { useTheme } from '@/context/ThemeProvider';

type JamieAssistantWorkspaceProps = {
  apiRoute?: string;
  propertyData?: unknown;
  memoryContext?: unknown;
  isDevMode?: boolean;
};

export default function JamieAssistantWorkspace({
  apiRoute = '/api/jamie/chat',
  propertyData,
  memoryContext,
  isDevMode = false
}: JamieAssistantWorkspaceProps) {
  const { agentId, assistantProfile } = useTheme();
  const modelAdapter = useMemo<ChatModelAdapter>(() => ({
    async run({ messages, abortSignal }) {
      const response = await fetch(apiRoute, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: toJamieMessages(messages),
          propertyData,
          memoryContext,
          isDevMode,
          agentId,
        }),
        signal: abortSignal
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const contentType = response.headers.get('content-type') || '';
      const payload = contentType.includes('application/json')
        ? await response.json()
        : await response.text();
      const text = getJamieDisplayContent(payload);
      const tensorzero = payload && typeof payload === 'object' ? payload.tensorzero : undefined;

      return {
        content: [{ type: 'text', text }],
        metadata: {
          custom: {
            tensorzero
          }
        }
      };
    }
  }), [agentId, apiRoute, isDevMode, memoryContext, propertyData]);

  const runtime = useLocalRuntime(modelAdapter);

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <section className="flex min-h-0 flex-1 overflow-hidden rounded-2xl border border-cyan-200/15 bg-slate-950/80 shadow-[0_24px_80px_rgba(2,8,23,0.4)]">
        <aside className="hidden w-72 shrink-0 border-r border-white/10 bg-slate-950/70 p-4 lg:block">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-200/20 bg-cyan-200/10 text-cyan-100">
              <Bot size={18} />
            </div>
            <div>
              <p className="text-sm font-black text-white">{assistantProfile.displayName} Workspace</p>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-200/70">assistant-ui runtime</p>
            </div>
          </div>

          <div className="mt-5 grid gap-2 text-xs text-slate-300">
            <Link
              href="/command-center"
              className="flex items-center justify-between rounded-lg border border-cyan-200/15 bg-cyan-200/10 px-3 py-2.5 font-bold text-cyan-50 transition hover:bg-cyan-200/15"
            >
              <span className="flex items-center gap-2"><Command size={14} /> Command Center</span>
              <ArrowUp size={13} className="rotate-45" />
            </Link>
            <Link
              href="/api/tensorzero/jamie-chat"
              className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2.5 font-bold text-slate-200 transition hover:bg-white/[0.07]"
            >
              <span className="flex items-center gap-2"><TerminalSquare size={14} /> {assistantProfile.displayName} Traces</span>
              <ArrowUp size={13} className="rotate-45" />
            </Link>
          </div>

          <div className="mt-5 rounded-xl border border-white/10 bg-slate-900/70 p-3">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Backbone</p>
            <div className="mt-3 space-y-2 text-xs font-bold text-slate-200">
              <p>Route: <span className="font-mono text-cyan-200">{apiRoute}</span></p>
              <p>TensorZero: <span className="text-emerald-200">jamie_chat</span></p>
              <p>Command Center: <span className="text-cyan-200">helper context</span></p>
            </div>
          </div>
        </aside>

        <Thread assistantName={assistantProfile.displayName} />
      </section>
    </AssistantRuntimeProvider>
  );
}

function Thread({ assistantName }: { assistantName: string }) {
  return (
    <ThreadPrimitive.Root className="flex min-w-0 flex-1 flex-col bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.12),transparent_35%),linear-gradient(180deg,rgba(15,23,42,0.92),rgba(2,6,23,0.96))]">
      <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-4 py-4 sm:px-6">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-cyan-200" />
            <h1 className="truncate text-lg font-black text-white">{assistantName} Chat</h1>
          </div>
          <p className="mt-1 text-xs text-slate-400">Maximized workspace with assistant-ui state, assistant API routing, and Command Center context.</p>
        </div>
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-md border border-white/10 bg-white/[0.05] px-3 py-2 text-xs font-black uppercase tracking-[0.14em] text-slate-100 transition hover:bg-white/[0.09]"
        >
          <Maximize2 size={13} /> Dock
        </Link>
      </div>

      <ThreadPrimitive.Viewport className="min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-6">
        <ThreadPrimitive.Empty>
          <div className="mx-auto flex max-w-2xl flex-col items-center justify-center py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan-200/20 bg-cyan-200/10 text-cyan-100">
              <Bot size={24} />
            </div>
            <h2 className="mt-5 text-2xl font-black text-white">{assistantName} is ready.</h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-slate-400">
              Ask a property question, draft a client note, or hand off a messy task. This route keeps {assistantName} connected to the same helper layer as the Command Center.
            </p>
          </div>
        </ThreadPrimitive.Empty>

        <ThreadPrimitive.Messages components={{ Message }} />

        <ThreadPrimitive.ViewportFooter className="sticky bottom-0 mt-6 bg-gradient-to-t from-slate-950 via-slate-950/95 to-transparent pb-4 pt-8">
          <Composer assistantName={assistantName} />
        </ThreadPrimitive.ViewportFooter>
      </ThreadPrimitive.Viewport>
    </ThreadPrimitive.Root>
  );
}

function Message() {
  const message = useMessage();
  const isUser = message.role === 'user';
  const tensorzero = !isUser && message.metadata?.custom && typeof message.metadata.custom === 'object'
    ? (message.metadata.custom as { tensorzero?: { status?: string; variantName?: string; score?: number } }).tensorzero
    : undefined;

  return (
    <MessagePrimitive.Root className={`mb-5 flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[86%] rounded-2xl border px-4 py-3 text-sm shadow-lg ${
        isUser
          ? 'border-blue-300/20 bg-blue-600 text-white'
          : 'border-white/10 bg-slate-900/90 text-slate-100'
      }`}>
        <MessagePrimitive.Content components={{ Text: MessageText }} />
        {tensorzero && (
          <div className="mt-3 flex flex-wrap gap-2 border-t border-white/10 pt-2 text-[9px] font-black uppercase tracking-[0.12em] text-cyan-100/80">
            <span>TensorZero {tensorzero.status || 'ready'}</span>
            {tensorzero.variantName && <span className="font-mono normal-case tracking-normal">{tensorzero.variantName}</span>}
            {typeof tensorzero.score === 'number' && <span>{Math.round(tensorzero.score)} score</span>}
          </div>
        )}
      </div>
    </MessagePrimitive.Root>
  );
}

function MessageText() {
  return <MessagePartPrimitive.Text component="p" className="whitespace-pre-wrap leading-6" />;
}

function Composer({ assistantName }: { assistantName: string }) {
  return (
    <ComposerPrimitive.Root className="mx-auto grid w-full max-w-4xl grid-cols-[minmax(0,1fr)_auto_auto] items-end gap-3 rounded-2xl border border-cyan-200/20 bg-slate-900/95 p-3 shadow-[0_18px_50px_rgba(2,8,23,0.45)]">
      <ComposerPrimitive.Input
        placeholder={`Ask ${assistantName}, or describe the command-center task...`}
        submitMode="enter"
        rows={2}
        className="min-h-14 w-full min-w-0 resize-none appearance-none border-0 bg-transparent px-2 py-2 text-sm leading-6 text-white shadow-none outline-none ring-0 placeholder:text-slate-500 focus:border-0 focus:outline-none focus:ring-0"
      />
      <ComposerPrimitive.Cancel className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.05] text-slate-200 transition hover:bg-white/[0.09] data-[disabled]:hidden 2xl:inline-flex">
        <RotateCcw size={16} />
      </ComposerPrimitive.Cancel>
      <ComposerPrimitive.Send className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-cyan-300 text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-40">
        <Send size={16} />
      </ComposerPrimitive.Send>
      <ThreadPrimitive.If running>
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-cyan-200/20 bg-cyan-200/10 text-cyan-100">
          <Loader2 size={16} className="animate-spin" />
        </div>
      </ThreadPrimitive.If>
    </ComposerPrimitive.Root>
  );
}

function toJamieMessages(messages: readonly ThreadMessage[]) {
  return messages
    .filter((message) => message.role === 'user' || message.role === 'assistant' || message.role === 'system')
    .map((message) => ({
      role: message.role,
      content: message.content
        .map((part) => part.type === 'text' ? part.text : '')
        .join('\n')
        .trim()
    }))
    .filter((message) => message.content.length > 0);
}
