'use client';

import React, { useEffect, useId, useRef, useState } from 'react';
import Link from 'next/link';
import { ModalSurface } from './ModalSurface';
import { sellerScheduleResultSchema, type SellerSavedSchedule } from '@/lib/realtor-workspace/leadContracts';
import { dueSpecSchema } from '@/lib/realtor-workspace/contracts';

type Props = {
  leadId: string;
  leadName: string;
  leadRevision: number;
  timeZone: string;
  retryRequests: Map<string, string>;
  actionKey: 'initial-response:v1' | `reply:${string}` | `consultation:${string}`;
  consultationStartsAt?: string;
  disabled?: boolean;
  onConflict?: () => void;
  onReload?: () => Promise<boolean>;
  onClose: () => void;
  onSaved: () => void;
};

function localToday(timeZone: string) {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
    const value = (type: string) => parts.find((part) => part.type === type)?.value || '';
    return `${value('year')}-${value('month')}-${value('day')}`;
  } catch { return ''; }
}

function localDateTime(value: string, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(new Date(value));
  const part = (type: string) => parts.find((candidate) => candidate.type === type)?.value || '';
  return { date: `${part('year')}-${part('month')}-${part('day')}`, time: `${part('hour')}:${part('minute')}` };
}

export function SellerLeadScheduleDialog({ leadId, leadName, leadRevision, timeZone: initialTimeZone, actionKey, consultationStartsAt, retryRequests, disabled = false, onConflict, onReload, onClose, onSaved }: Props) {
  const titleId = useId();
  const validationId = useId();
  const lockedConsultation = actionKey.startsWith('consultation:') && Boolean(consultationStartsAt);
  const consultationLocal = lockedConsultation ? localDateTime(consultationStartsAt!, initialTimeZone) : null;
  const consultationOffset = lockedConsultation && consultationLocal
    ? Math.round((Date.UTC(Number(consultationLocal.date.slice(0, 4)), Number(consultationLocal.date.slice(5, 7)) - 1, Number(consultationLocal.date.slice(8, 10)), Number(consultationLocal.time.slice(0, 2)), Number(consultationLocal.time.slice(3, 5)))-Date.parse(consultationStartsAt!)) / 60_000)
    : undefined;
  const [date, setDate] = useState(() => consultationLocal?.date || localToday(initialTimeZone));
  const [time, setTime] = useState(() => consultationLocal?.time || '09:00');
  const [timeZone, setTimeZone] = useState(initialTimeZone);
  const [reminder, setReminder] = useState(true);
  const [saving, setSaving] = useState(false);
  const [reloading, setReloading] = useState(false);
  const [conflicted, setConflicted] = useState(false);
  const [error, setError] = useState('');
  const [lookupRefresh, setLookupRefresh] = useState(0);
  const [lookup, setLookup] = useState<{ key: string; saved?: SellerSavedSchedule | null; error?: string } | null>(null);
  const inFlight = useRef(false);
  const query = new URLSearchParams({ leadId, actionKey }).toString();
  const lookupKey = `${query}:${leadRevision}:${lookupRefresh}`;
  const currentLookup = lookup?.key === lookupKey ? lookup : null;
  const savedSchedule = currentLookup?.saved;
  const checkingSchedule = !currentLookup;
  const scheduleUnavailable = Boolean(currentLookup?.error);
  const paused = disabled || conflicted;
  const pending = saving || reloading;
  const due = dueSpecSchema.safeParse({
    anchorDate: date, localTime: time, timeZone,
    recurrence: { frequency: 'once' }, endsOn: date,
    reminderOffsetsDays: reminder ? [0] : [],
    ...(consultationOffset !== undefined ? { utcOffsetMinutes: consultationOffset } : {}),
  });
  const invalidPath = due.success ? undefined : due.error.issues[0]?.path[0];
  const validationError = due.success ? '' : invalidPath === 'timeZone' ? 'Choose a valid time zone, such as America/Chicago.'
    : invalidPath === 'localTime' ? 'Choose a valid time.' : 'Choose a valid date.';
  const invalidField = (field: string) => !due.success && due.error.issues.some((issue) => issue.path[0] === field);

  useEffect(() => {
    const controller = new AbortController();
    void fetch(`/api/realtor/leads/schedule?${query}`, { cache: 'no-store', signal: controller.signal })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok || payload?.ok !== true) throw new Error();
        const saved = sellerScheduleResultSchema.parse(payload.result);
        if (!controller.signal.aborted) setLookup({ key: lookupKey, saved });
      }).catch(() => {
        if (!controller.signal.aborted) setLookup({ key: lookupKey, error: 'The existing schedule could not be checked. Retry before creating a task.' });
      });
    return () => controller.abort();
  }, [query, lookupKey]);

  const reload = async () => {
    if (!onReload || inFlight.current) return;
    inFlight.current = true;
    setReloading(true);
    try {
      if (await onReload()) { setConflicted(false); setError(''); setLookupRefresh((value) => value + 1); }
      else setError('Could not reload this seller request. Try reloading again.');
    } catch { setError('Could not reload this seller request. Try reloading again.'); }
    finally { inFlight.current = false; setReloading(false); }
  };

  const save = async () => {
    if (paused || checkingSchedule || scheduleUnavailable || savedSchedule || !due.success || inFlight.current) return;
    const titleVerb = actionKey.startsWith('consultation:') ? 'Seller consultation' : actionKey.startsWith('reply:') ? 'Follow up on seller reply' : 'Respond to seller request';
    const title = `${titleVerb} — ${leadName.trim().slice(0, 90)}`;
    const item = {
      kind: lockedConsultation ? 'appointment' : 'follow_up', title,
      notes: lockedConsultation ? 'Confirmed seller consultation. This planner item does not create or change the consultation outcome.' : 'Review the seller’s request and respond personally.',
      due: due.data,
      expectedAmountCents: null, property: null, sourceSprintTaskId: null,
      sellerLead: { leadId, actionKey, expectedLeadRevision: leadRevision },
    };
    const fingerprint = JSON.stringify(item);
    const requestKey = retryRequests.get(fingerprint) || crypto.randomUUID();
    retryRequests.set(fingerprint, requestKey);
    inFlight.current = true;
    setSaving(true); setError('');
    try {
      const response = await fetch('/api/realtor/planner', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId: null, expectedRevision: null, item: { ...item, requestKey } }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || payload?.ok !== true) {
        if (response.status === 409) { setConflicted(true); onConflict?.(); setLookupRefresh((value) => value + 1); }
        throw new Error(payload?.error || 'Could not schedule this seller action.');
      }
      retryRequests.delete(fingerprint);
      onSaved();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not schedule this seller action.');
    } finally { inFlight.current = false; setSaving(false); }
  };

  return <ModalSurface labelId={titleId} onClose={() => { if (!inFlight.current) onClose(); }}>
    <div className="text-white">
      <h2 id={titleId} className="text-lg font-bold">{lockedConsultation ? 'Schedule confirmed consultation' : actionKey.startsWith('reply:') ? 'Schedule seller follow-up' : 'Schedule seller response'}</h2>
      <p className="mt-2 text-sm text-slate-300">{lockedConsultation ? `Create a private planner appointment for ${leadName} at the confirmed time. The appointment time cannot be changed here.` : `Create a private planner reminder to ${actionKey.startsWith('reply:') ? 'follow up on' : 'review'} ${leadName}’s ${actionKey.startsWith('reply:') ? 'reply' : 'request'}. Scheduling does not record that contact happened.`}</p>
      {checkingSchedule ? <p role="status" className="mt-4 text-sm text-slate-300">Checking for an existing planner task…</p> : null}
      {scheduleUnavailable ? <div className="mt-4 text-sm text-rose-100"><p role="alert">{currentLookup?.error}</p><button type="button" onClick={() => setLookupRefresh((value) => value + 1)} className="mt-2 underline">Retry schedule lookup</button></div> : null}
      {savedSchedule ? <div className="mt-4 rounded-lg border border-cyan-300/25 p-3 text-sm"><p role="status">This seller action is already in your planner.</p>
        <p className="mt-2 text-slate-300">{savedSchedule.title} · {savedSchedule.occurrenceStatus || savedSchedule.itemStatus}{savedSchedule.effectiveDate ? ` · ${savedSchedule.effectiveDate}` : ''}</p>
        <Link href={savedSchedule.effectiveDate ? `/planner?date=${encodeURIComponent(savedSchedule.effectiveDate)}` : '/planner'} className="mt-3 inline-flex text-cyan-200 underline">Open saved planner task</Link></div> : null}
      {!savedSchedule ? <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="text-sm">Date<input id="seller-lead-schedule-date" type="date" min={localToday(timeZone.trim()) || undefined} value={date} onChange={(event) => setDate(event.target.value)} readOnly={lockedConsultation} aria-invalid={invalidField('anchorDate')} aria-describedby={validationError ? validationId : undefined} className="mt-1 w-full rounded-lg border border-white/15 bg-slate-900 px-3 py-2" /></label>
        <label className="text-sm">Time<input type="time" value={time} onChange={(event) => setTime(event.target.value)} readOnly={lockedConsultation} aria-invalid={invalidField('localTime')} aria-describedby={validationError ? validationId : undefined} className="mt-1 w-full rounded-lg border border-white/15 bg-slate-900 px-3 py-2" /></label>
        <label className="text-sm sm:col-span-2">Time zone<input value={timeZone} onChange={(event) => setTimeZone(event.target.value)} maxLength={80} readOnly={lockedConsultation} aria-invalid={invalidField('timeZone')} aria-describedby={validationError ? validationId : undefined} className="mt-1 w-full rounded-lg border border-white/15 bg-slate-900 px-3 py-2" /></label>
        <label className="flex items-center gap-2 text-sm text-slate-300 sm:col-span-2"><input type="checkbox" checked={reminder} onChange={(event) => setReminder(event.target.checked)} />Remind me at the scheduled time</label>
      </div> : null}
      {!savedSchedule && validationError ? <p id={validationId} role="alert" className="mt-4 text-sm text-amber-100">{validationError}</p> : null}
      {paused ? <div className="mt-4 text-sm text-amber-100"><p role="status">Scheduling is paused until the seller request is available and current.</p>
        {onReload ? <button type="button" disabled={pending} onClick={() => void reload()} className="mt-2 underline">{reloading ? 'Reloading…' : 'Reload seller request'}</button>
          : <Link href={`/seller-inbox?leadId=${encodeURIComponent(leadId)}`} className="mt-2 inline-flex underline">Review current seller request</Link>}</div> : null}
      {error ? <p role="alert" className="mt-4 rounded-lg border border-rose-300/25 bg-rose-300/10 p-3 text-sm text-rose-100">{error}{!paused ? ' You can retry the unchanged draft without creating a duplicate.' : ''}</p> : null}
      <div className="mt-5 flex justify-end gap-2"><button type="button" disabled={pending} onClick={onClose} className="rounded-lg border border-white/15 px-4 py-2 text-sm">{savedSchedule ? 'Close' : 'Cancel'}</button>{!savedSchedule ? <button type="button" disabled={pending || paused || checkingSchedule || scheduleUnavailable || !due.success} onClick={() => void save()} className="rounded-lg bg-cyan-300 px-4 py-2 text-sm font-bold text-slate-950 disabled:opacity-50">{saving ? 'Scheduling…' : lockedConsultation ? 'Schedule appointment' : 'Schedule response'}</button> : null}</div>
    </div>
  </ModalSurface>;
}
