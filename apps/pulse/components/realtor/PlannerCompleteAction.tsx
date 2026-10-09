'use client';

import React, { useRef, useState } from 'react';

export function PlannerCompleteAction({ occurrence, busy, submit }: {
  occurrence: { id: string; revision: number };
  busy: boolean;
  submit: (url: string, method: 'POST' | 'PATCH', data: unknown, success: string) => Promise<boolean>;
}) {
  const keys = useRef(new Map<string, string>());
  const inFlight = useRef(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const complete = async () => {
    if (busy || inFlight.current) return;
    const fingerprint = `${occurrence.id}:${occurrence.revision}`;
    const requestKey = keys.current.get(fingerprint) || crypto.randomUUID();
    keys.current.set(fingerprint, requestKey);
    inFlight.current = true;
    setSaving(true); setError('');
    try {
      const saved = await submit(`/api/realtor/planner/${occurrence.id}`, 'PATCH', {
        action: 'complete', expectedRevision: occurrence.revision, requestKey,
      }, 'Marked complete.');
      if (saved) keys.current.delete(fingerprint);
    } catch {
      setError('Completion could not be confirmed. Retry to check the same request.');
    } finally { inFlight.current = false; setSaving(false); }
  };
  return <div>
    <button type="button" disabled={busy || saving} onClick={() => void complete()}
      className="rounded-lg border border-white/15 px-3 py-2 text-sm font-semibold text-slate-200 hover:bg-white/10 disabled:opacity-50">{saving ? 'Completing…' : 'Mark complete'}</button>
    {error ? <p role="alert" className="mt-2 text-xs text-rose-200">{error}</p> : null}
  </div>;
}
