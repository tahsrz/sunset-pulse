'use client';

import React from 'react';
import type { AgentRun, AttentionDecision } from '@/lib/agent-workspace/types';

export function AgentActivity({ runs, attention, onCancel, onRetry, selectedRunId, onSelectRun }: {
  runs: AgentRun[]; attention?: AttentionDecision;
  onCancel: (id: string) => void; onRetry: (id: string) => void;
  selectedRunId?: string; onSelectRun?: (id: string) => void;
}) {
  return <section className="rounded-lg border border-white/10 p-4">
    <h2 className="text-sm font-black uppercase tracking-wider text-cyan-100">Activity</h2>
    {attention ? <details className="mt-3 rounded border border-white/10 p-3">
      <summary className="cursor-pointer text-sm">Automatic decision: {attention.action}</summary>
      <p className="mt-2 text-xs text-slate-300">{attention.reason} · {attention.mode}</p>
    </details> : <p className="mt-3 text-sm text-slate-400">Automatic listening decisions will be shown here.</p>}
    <div className="mt-3 grid gap-2">{runs.slice().reverse().map((run) => <div key={run.id} className="rounded border border-white/10 p-3 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button type="button" aria-pressed={selectedRunId === run.id} onClick={() => onSelectRun?.(run.id)} className="min-h-10 text-left font-semibold text-cyan-100 underline">View {run.source} run · {run.state}</button>
        {run.state === 'running' ? <button type="button" onClick={() => onCancel(run.id)} className="min-h-10 text-xs text-amber-200 underline">Cancel client request</button> : run.state === 'error' || run.state === 'cancelled' ? <button type="button" onClick={() => onRetry(run.id)} className="min-h-10 text-xs text-cyan-100 underline">Retry</button> : null}
      </div>
      <p className="mt-1 line-clamp-2 text-xs text-slate-400">{run.submittedText}</p>
      {run.error ? <p className="mt-1 text-xs text-rose-200">{run.error}</p> : null}
    </div>)}</div>
  </section>;
}
