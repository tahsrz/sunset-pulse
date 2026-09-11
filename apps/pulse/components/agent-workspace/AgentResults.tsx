'use client';

import React from 'react';
import { useState } from 'react';
import type { AgentRun } from '@/lib/agent-workspace/types';

export function AgentResults({ run }: { run?: AgentRun }) {
  const [copied, setCopied] = useState(false);
  if (!run) return <section className="rounded-lg border border-dashed border-white/15 p-5 text-sm leading-6 text-slate-400">Submit a request to see this agent’s work. Results stay attached to the agent and run that produced them.</section>;
  if (run.state === 'running' || run.state === 'queued') return <section className="rounded-lg border border-cyan-200/20 bg-cyan-200/5 p-5" aria-live="polite"><p className="text-sm font-bold text-cyan-100">Working on the submitted request…</p><ul className="mt-3 grid gap-2 text-xs text-slate-300">{run.progress.slice(-5).map((item) => <li key={item.id}>• {item.label}{item.detail ? `: ${item.detail}` : ''}</li>)}</ul></section>;
  if (run.state === 'cancelled') return <section className="rounded-lg border border-amber-200/20 p-5 text-sm text-amber-100">The client request was cancelled. A server-side command may still finish; no automatic retry was sent.</section>;
  if (run.state === 'error') return <section className="rounded-lg border border-rose-200/20 p-5 text-sm text-rose-100">{run.error || 'This run failed.'}</section>;
  const response = run.response;
  if (!response) return null;
  const copy = async () => { await navigator.clipboard?.writeText(response.result.deliverable.copyReadyText); setCopied(true); window.setTimeout(() => setCopied(false), 1500); };
  return <section className="grid gap-4 rounded-lg border border-emerald-200/20 bg-emerald-200/5 p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-200">{response.worker.name}</p><h2 className="mt-1 text-xl font-bold text-white">{response.result.deliverable.title || response.result.title}</h2><p className="mt-1 text-sm text-slate-300">{response.result.summary}</p></div><button type="button" onClick={() => void copy()} className="min-h-10 rounded bg-emerald-200 px-3 text-xs font-black text-slate-950">{copied ? 'Copied' : 'Copy output'}</button></div><div className="whitespace-pre-wrap rounded border border-white/10 bg-slate-950/50 p-4 text-sm leading-7 text-slate-100">{response.result.deliverable.copyReadyText}</div>{response.result.actions.length ? <details className="rounded border border-white/10 p-3"><summary className="cursor-pointer text-sm font-bold">Suggested next steps</summary><ul className="mt-2 grid gap-2 text-sm text-slate-300">{response.result.actions.map((action) => <li key={action}>• {action}</li>)}</ul></details> : null}{response.trace?.selectedShards?.length ? <details className="rounded border border-white/10 p-3"><summary className="cursor-pointer text-sm font-bold">Sources and trace</summary><div className="mt-2 grid gap-3 text-xs leading-5 text-slate-300">{response.trace.selectedShards.slice(0, 5).map((source) => <div key={`${source.source}-${source.title}`}><p className="font-bold text-white">{source.title}</p><p>{source.excerpt}</p><p className="text-slate-500">{source.source}</p></div>)}</div></details> : null}</section>;
}
