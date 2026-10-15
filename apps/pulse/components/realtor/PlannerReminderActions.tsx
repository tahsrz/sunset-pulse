'use client';

import React, { useRef, useState } from 'react';
import Link from 'next/link';
import { realtorDateSchema } from '@/lib/realtor-workspace/contracts';

type Action = 'dismiss' | 'snooze';
type Request = { reminderId: string; expectedRevision: number; requestKey: string; action: Action; until?: string };

export function PlannerReminderActions({ reminder, dueDate, busy, submit, onReload }: {
  reminder: { id: string; revision: number };
  dueDate?: string | null;
  busy: boolean;
  submit: (url: string, method: 'POST' | 'PATCH', data: unknown, success: string) => Promise<boolean | 'conflict'>;
  onReload: () => Promise<boolean>;
}) {
  const requests = useRef(new Map<string, Request>());
  const inFlight = useRef(false);
  const [saving, setSaving] = useState<Action | 'reload' | null>(null);
  const [uncertain, setUncertain] = useState<{ revisionKey: string; action: Action } | null>(null);
  const [conflictKey, setConflictKey] = useState<string | null>(null);
  const [error, setError] = useState('');
  const revisionKey = `${reminder.id}:${reminder.revision}`;
  const pendingAction = uncertain?.revisionKey === revisionKey ? uncertain.action : null;
  const conflicted = conflictKey === revisionKey;
  const date = realtorDateSchema.safeParse(dueDate);
  const buttonClass = 'rounded-lg border border-white/15 px-3 py-2 text-sm font-semibold text-slate-200 hover:bg-white/10 disabled:opacity-50';

  const change = async (action: Action) => {
    if (busy || conflicted || inFlight.current || (pendingAction && pendingAction !== action)) return;
    const fingerprint = `${revisionKey}:${action}`;
    const request = requests.current.get(fingerprint) || {
      reminderId: reminder.id, expectedRevision: reminder.revision, requestKey: crypto.randomUUID(), action,
      ...(action === 'snooze' ? { until: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() } : {}),
    };
    requests.current.set(fingerprint, request);
    inFlight.current = true; setSaving(action); setError('');
    try {
      const result = await submit('/api/realtor/reminders', 'PATCH', request,
        action === 'dismiss' ? 'Reminder dismissed.' : 'Reminder snoozed for 24 hours.');
      if (result === true) {
        requests.current.clear(); setUncertain(null); setConflictKey(null);
      } else if (result === 'conflict') {
        setConflictKey(revisionKey); setUncertain(null);
      } else setUncertain({ revisionKey, action });
    } catch { setUncertain({ revisionKey, action }); }
    finally { inFlight.current = false; setSaving(null); }
  };

  const reload = async () => {
    if (busy || inFlight.current) return;
    inFlight.current = true; setSaving('reload'); setError('');
    try {
      if (await onReload()) { setUncertain(null); setConflictKey(null); }
      else setError('Reminders could not be refreshed. Try again.');
    } catch { setError('Reminders could not be refreshed. Try again.'); }
    finally { inFlight.current = false; setSaving(null); }
  };

  return <div className="mt-3">
    <Link href={date.success ? `/planner?date=${encodeURIComponent(date.data)}` : '/planner'} className="inline-flex text-sm font-semibold text-cyan-200 underline">Open reminder task</Link>
    <div className="mt-3 flex flex-wrap gap-2">
      <button type="button" disabled={busy || conflicted || Boolean(saving) || pendingAction === 'snooze'} onClick={() => void change('dismiss')} className={buttonClass}>{saving === 'dismiss' ? 'Dismissing…' : 'Dismiss reminder'}</button>
      <button type="button" disabled={busy || conflicted || Boolean(saving) || pendingAction === 'dismiss'} onClick={() => void change('snooze')} className={buttonClass}>{saving === 'snooze' ? 'Snoozing…' : 'Snooze 24 hours'}</button>
    </div>
    {pendingAction || conflicted ? <div className="mt-3 text-xs text-amber-100"><p role="status">{conflicted ? 'This reminder changed. Refresh reminders before making another change.' : 'The reminder change could not be confirmed. Retry the same action or refresh reminders before choosing another action.'}</p>
      <button type="button" disabled={busy || Boolean(saving)} onClick={() => void reload()} className="mt-2 underline">{saving === 'reload' ? 'Refreshing…' : 'Refresh reminders'}</button></div> : null}
    {error ? <p role="alert" className="mt-2 text-xs text-rose-200">{error}</p> : null}
  </div>;
}
