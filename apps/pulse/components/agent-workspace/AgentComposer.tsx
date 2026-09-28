'use client';

import React from 'react';
import type { AgentSession, AgentRun } from '@/lib/agent-workspace/types';

export function AgentComposer({ agent, busy, run, onChange, onUseSpeech, onSubmit }: { agent: AgentSession; busy: boolean; run?: AgentRun; onChange: (text: string) => void; onUseSpeech: () => void; onSubmit: () => void }) {
  return <form onSubmit={(event) => { event.preventDefault(); onSubmit(); }} className="rounded-lg border border-white/10 bg-slate-950/35 p-4">
    <div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[0.14em] text-cyan-200">Manual submission</p><p className="mt-1 text-sm text-slate-300">To <span className="font-bold text-white">{agent.label}</span> · exact visible text is sent to its worker.</p></div>{agent.draftDirty ? <span className="text-xs text-amber-200">Edited draft</span> : null}</div>
    <label className="sr-only" htmlFor={`agent-draft-${agent.id}`}>Submission for {agent.label}</label><textarea id={`agent-draft-${agent.id}`} value={agent.draftText} onChange={(event) => onChange(event.target.value)} rows={7} maxLength={20_000} placeholder="Type a request, or use finalized speech…" className="mt-3 w-full rounded border border-slate-600 bg-slate-950 px-3 py-3 text-sm leading-6 text-white placeholder:text-slate-500" />
    <div className="mt-3 flex flex-wrap items-center gap-2"><button type="button" onClick={onUseSpeech} className="min-h-10 rounded border border-white/15 px-3 text-xs font-bold text-slate-200">Use recent speech</button><button type="submit" disabled={busy || !agent.draftText.trim()} className="min-h-10 rounded bg-cyan-200 px-4 text-xs font-black text-slate-950 disabled:cursor-not-allowed disabled:opacity-50">{busy ? 'This agent is working' : `Submit now → ${agent.label}`}</button></div>
    {run?.state === 'cancelled' ? <p className="mt-2 text-xs text-amber-200">Client transport cancelled; server work may already have started.</p> : null}
  </form>;
}
