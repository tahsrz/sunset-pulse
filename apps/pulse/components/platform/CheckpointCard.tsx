'use client';

import React, { useState } from 'react';
import type { ReactNode } from 'react';

export type CheckpointCardData = {
  id: string;
  node_id: string;
  type: 'question' | 'approval' | 'effect_gate';
  prompt: string;
  response_schema?: { type: 'string' | 'number' | 'boolean'; enum?: string[] } | null;
  target?: { resourceType: string; resourceId: string; revision: number; action: string; contentHash?: string } | null;
  revision: number;
};

export type CheckpointCardProps = {
  checkpoint: CheckpointCardData;
  onRespond: (input: { checkpointId: string; expectedRevision: number; submissionKey: string; value: string | number | boolean }) => Promise<void> | void;
  error?: string | null;
  disabled?: boolean;
  footer?: ReactNode;
};

export function CheckpointCard({ checkpoint, onRespond, error, disabled = false, footer }: CheckpointCardProps) {
  const [value, setValue] = useState<string | number | boolean>(checkpoint.response_schema?.type === 'boolean' ? false : '');
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const question = checkpoint.type === 'question';
  const schema = checkpoint.response_schema;

  async function submit() {
    if (question && value === '') return;
    setLocalError(null); setSubmitting(true);
    try {
      await onRespond({ checkpointId: checkpoint.id, expectedRevision: checkpoint.revision, submissionKey: crypto.randomUUID(), value });
    } catch (cause) {
      setLocalError(cause instanceof Error ? cause.message : 'Checkpoint changed. Reload before responding.');
    } finally { setSubmitting(false); }
  }

  return (
    <article className="rounded-xl border border-white/10 bg-slate-900/80 p-5 text-slate-100" aria-labelledby={`checkpoint-${checkpoint.id}`}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <span className="rounded-full bg-white/10 px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-cyan-200">{checkpoint.type.replace('_', ' ')}</span>
        <span className="text-xs text-slate-400">Revision {checkpoint.revision}</span>
      </div>
      <h3 id={`checkpoint-${checkpoint.id}`} className="text-base font-semibold">{checkpoint.prompt}</h3>
      {checkpoint.target ? <dl className="mt-4 grid gap-1 text-xs text-slate-400"><div><dt className="inline font-semibold text-slate-300">Target: </dt><dd className="inline">{checkpoint.target.resourceType} / {checkpoint.target.resourceId}</dd></div><div><dt className="inline font-semibold text-slate-300">Version: </dt><dd className="inline">{checkpoint.target.revision} · {checkpoint.target.action}</dd></div></dl> : null}
      {question ? (
        schema?.enum ? <select value={typeof value === 'string' ? value : ''} onChange={(event) => setValue(event.target.value)} disabled={disabled || submitting} className="mt-5 w-full rounded-md border border-white/15 bg-slate-950 px-3 py-2 text-sm"><option value="">Choose a response…</option>{schema.enum.map((option) => <option key={option}>{option}</option>)}</select> :
        schema?.type === 'boolean' ? <label className="mt-5 flex items-center gap-2 text-sm"><input type="checkbox" checked={value === true} onChange={(event) => setValue(event.target.checked)} disabled={disabled || submitting} /> Confirm</label> :
        <input type={schema?.type === 'number' ? 'number' : 'text'} value={value as string | number} onChange={(event) => setValue(schema?.type === 'number' ? Number(event.target.value) : event.target.value)} disabled={disabled || submitting} className="mt-5 w-full rounded-md border border-white/15 bg-slate-950 px-3 py-2 text-sm" />
      ) : null}
      <button type="button" onClick={submit} disabled={disabled || submitting || (question && value === '')} className="mt-5 rounded-md bg-cyan-300 px-4 py-2 text-sm font-bold text-slate-950 disabled:opacity-50">{submitting ? 'Submitting…' : checkpoint.type === 'question' ? 'Save response' : 'Continue'}</button>
      {error || localError ? <p role="alert" className="mt-3 text-sm text-rose-300">{error || localError}</p> : null}
      {footer}
    </article>
  );
}
