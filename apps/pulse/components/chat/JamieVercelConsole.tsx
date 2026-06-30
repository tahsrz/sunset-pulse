'use client';

import React, { useMemo, useState } from 'react';
import { DefaultChatTransport } from 'ai';
import { useChat } from '@ai-sdk/react';
import { sanitizeJamieReply } from '@/lib/ai/jamieResponse';

function partText(part: any) {
  if (typeof part?.text === 'string') return part.text;
  if (typeof part?.content === 'string') return part.content;
  return '';
}

function ToolPart({ part }: { part: any }) {
  const output = part?.output || part?.result;
  const properties = Array.isArray(output?.properties) ? output.properties : [];

  return (
    <div className="mt-3 rounded-lg border border-cyan-400/20 bg-cyan-400/5 p-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-100">
          Jamie action
        </p>
        <span className="rounded-full bg-cyan-300/10 px-2 py-1 text-[9px] font-bold uppercase text-cyan-100">
          {part?.state || (output ? 'complete' : 'running')}
        </span>
      </div>

      {properties.length ? (
        <div className="mt-3 grid gap-2">
          {properties.slice(0, 4).map((property: any) => (
            <a
              key={property.id}
            href={property.href || `/properties/${encodeURIComponent(property.id)}`}
              className="rounded border border-white/10 bg-slate-950/70 p-3 transition hover:border-cyan-300/60"
            >
              <p className="truncate text-sm font-black text-white">{property.name}</p>
              <p className="mt-1 text-xs text-slate-300">
                {[property.city, property.state].filter(Boolean).join(', ') || property.source || 'Sunset Pulse'}
              </p>
            </a>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-xs text-cyan-50/70">Jamie completed a private tool step.</p>
      )}
    </div>
  );
}

function MessageParts({ message }: { message: any }) {
  const parts = Array.isArray(message.parts) ? message.parts : [];
  if (!parts.length && typeof message.content === 'string') {
    const content = message.role === 'assistant' ? sanitizeJamieReply(message.content) : message.content;
    return content ? <p className="whitespace-pre-wrap leading-7">{content}</p> : null;
  }

  return (
    <>
      {parts.map((part: any, index: number) => {
        if (part?.type === 'text') {
          const rawText = partText(part);
          const text = message.role === 'assistant' ? sanitizeJamieReply(rawText) : rawText;
          return text ? <p key={index} className="whitespace-pre-wrap leading-7">{text}</p> : null;
        }

        if (typeof part?.type === 'string' && part.type.startsWith('tool-')) {
          return <ToolPart key={index} part={part} />;
        }

        return null;
      })}
    </>
  );
}

export default function JamieVercelConsole() {
  const [input, setInput] = useState('');
  const transport = useMemo(() => new DefaultChatTransport({ api: '/api/jamie/vercel-chat' }), []);
  const { messages, sendMessage, status, error } = useChat({ transport });
  const isBusy = status === 'submitted' || status === 'streaming';

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const text = input.trim();
    if (!text || isBusy) return;
    sendMessage({ text });
    setInput('');
  };

  return (
    <section className="w-full rounded-xl border border-white/10 bg-slate-950/80 shadow-2xl">
      <div className="border-b border-white/10 p-4">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-200">Vercel AI SDK Surface</p>
        <h2 className="mt-2 text-2xl font-black text-white">Jamie Unified Console</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
          This route uses the shared Jamie agent tools through AI SDK streaming, so property search can become one bot core across the floating widget and the Vercel-style assistant.
        </p>
      </div>

      <div className="max-h-[560px] min-h-[360px] space-y-4 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <div className="rounded-lg border border-dashed border-white/15 p-6 text-sm text-slate-300">
            Try: <span className="font-mono text-cyan-100">Find 3 bedroom homes in Frisco under 1000000</span>
          </div>
        ) : messages.map((message: any) => (
          <div
            key={message.id}
            className={`max-w-[88%] rounded-xl p-4 text-sm ${
              message.role === 'user'
                ? 'ml-auto bg-blue-600 text-white'
                : 'mr-auto border border-white/10 bg-slate-900 text-slate-100'
            }`}
          >
            <MessageParts message={message} />
          </div>
        ))}

        {isBusy ? <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-200">Jamie is working...</p> : null}
        {error ? <p className="rounded border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-100">{error.message}</p> : null}
      </div>

      <form onSubmit={submit} className="flex gap-3 border-t border-white/10 p-4">
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Ask Jamie to search, compare, or explain..."
          className="min-w-0 flex-1 rounded-lg border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300"
        />
        <button
          type="submit"
          disabled={isBusy || !input.trim()}
          className="rounded-lg bg-cyan-300 px-5 py-3 text-sm font-black uppercase tracking-[0.14em] text-slate-950 transition disabled:cursor-not-allowed disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </section>
  );
}
