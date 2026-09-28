'use client';

import React, { useMemo, useState } from 'react';
import { DefaultChatTransport } from 'ai';
import { useChat } from '@ai-sdk/react';
import { sanitizeJamieReply } from '@/lib/ai/jamieResponse';
import { useTheme } from '@/context/ThemeProvider';

function partText(part: any) {
  if (typeof part?.text === 'string') return part.text;
  if (typeof part?.content === 'string') return part.content;
  return '';
}

function ToolPart({ part, workspaceId }: { part: any; workspaceId?: string }) {
  const { assistantProfile, branding } = useTheme();
  const output = part?.output || part?.result;
  const properties = Array.isArray(output?.properties) ? output.properties : [];
  const [confirming, setConfirming] = useState(false);
  const [launchResult, setLaunchResult] = useState<{ runId?: string; error?: string } | null>(null);
  const runs = output?.kind === 'workspace_run_summary' && Array.isArray(output.items) ? output.items : [];
  const proposal = output?.kind === 'app_launch_proposal' ? output : null;

  const confirmProposal = async () => {
    if (!workspaceId || proposal?.workspaceId !== workspaceId || confirming || launchResult?.runId) return;
    setConfirming(true);
    setLaunchResult(null);
    try {
      const response = await fetch(`/api/workspaces/${workspaceId}/apps/launch`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(proposal.request),
      });
      const body = await response.json();
      if (!response.ok || !body?.result?.id) throw new Error(body?.error || 'The workflow could not be started.');
      setLaunchResult({ runId: body.result.id });
    } catch (error) {
      setLaunchResult({ error: error instanceof Error ? error.message : 'The workflow could not be started.' });
    } finally {
      setConfirming(false);
    }
  };

  return (
    <div className="mt-3 rounded-lg border border-cyan-400/20 bg-cyan-400/5 p-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-100">
          {assistantProfile.toolActionLabel}
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
                {[property.city, property.state].filter(Boolean).join(', ') || property.source || branding.siteName || 'Sunset Pulse'}
              </p>
            </a>
          ))}
        </div>
      ) : runs.length ? (
        <div className="mt-3 grid gap-2">
          {runs.map((run: any) => <a key={run.id} href={run.href} className="rounded border border-white/10 bg-slate-950/70 p-3 hover:border-cyan-300/50">
            <span className="font-semibold text-white">{run.key} v{run.version}</span><span className="ml-2 text-slate-300">{run.status}</span>
          </a>)}
          {output.hasMore ? <p className="text-xs text-slate-400">Showing a bounded recent page.</p> : null}
        </div>
      ) : proposal ? (
        <div className="mt-3 rounded-lg border border-amber-300/30 bg-amber-300/5 p-3">
          <p className="font-bold text-amber-100">Workflow proposal: {proposal.title}</p>
          <p className="mt-1 text-xs text-amber-50/80">{proposal.workflowKey} v{proposal.workflowVersion} · install revision {proposal.installRevision} · {proposal.resourceCount} linked resource(s)</p>
          <p className="mt-2 text-xs text-slate-300">This has not started. Review the request, then explicitly confirm to create a run.</p>
          {launchResult?.runId ? <a className="mt-3 inline-block text-sm font-bold text-cyan-200 underline" href={`/workspaces/${workspaceId}/runs/${launchResult.runId}`}>Run started — open details</a> : (
            <button type="button" onClick={confirmProposal} disabled={!workspaceId || proposal.workspaceId !== workspaceId || confirming} className="mt-3 rounded bg-amber-300 px-3 py-2 text-xs font-black uppercase text-slate-950 disabled:opacity-50">
              {confirming ? 'Starting…' : 'Start workflow'}
            </button>
          )}
          {launchResult?.error ? <p role="alert" className="mt-2 text-xs text-rose-200">{launchResult.error}</p> : null}
        </div>
      ) : (
        <p className="mt-3 text-xs text-cyan-50/70">{assistantProfile.displayName} completed a private tool step.</p>
      )}
    </div>
  );
}

function MessageParts({ message, workspaceId }: { message: any; workspaceId?: string }) {
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
          return <ToolPart key={index} part={part} workspaceId={workspaceId} />;
        }

        return null;
      })}
    </>
  );
}

export default function JamieVercelConsole({ workspaceId }: { workspaceId?: string }) {
  const { assistantProfile } = useTheme();
  const [input, setInput] = useState('');
  const transport = useMemo(() => new DefaultChatTransport({
    api: '/api/jamie/vercel-chat',
    ...(workspaceId ? { body: { workspaceId } } : {}),
  }), [workspaceId]);
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
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-200">{workspaceId ? 'Private workspace assistant' : 'Vercel AI SDK Surface'}</p>
        <h2 className="mt-2 text-2xl font-black text-white">{assistantProfile.displayName} {workspaceId ? 'Workspace Copilot' : 'Unified Console'}</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
          {workspaceId ? 'Jamie can read this workspace’s recent runs and prepare validated app-launch proposals. Starting a workflow always requires your explicit confirmation.' : 'This route uses the shared assistant tools through AI SDK streaming, so property search can become one bot core across the floating widget and the Vercel-style assistant.'}
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
            <MessageParts message={message} workspaceId={workspaceId} />
          </div>
        ))}

        {isBusy ? <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-200">{assistantProfile.displayName} is {assistantProfile.statusLabel}...</p> : null}
        {error ? <p className="rounded border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-100">{error.message}</p> : null}
      </div>

      <form onSubmit={submit} className="flex gap-3 border-t border-white/10 p-4">
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder={`Ask ${assistantProfile.displayName} to search, compare, or explain...`}
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
