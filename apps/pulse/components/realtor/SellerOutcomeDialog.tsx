'use client';

import React, { useRef, useState } from 'react';
import { ModalSurface } from './ModalSurface';
import { SellerOutcomePicker } from './SellerOutcomePicker';
import { localDateTimeInZone, possibleUtcInstantsForLocalDateTime } from '@/lib/realtor-workspace/progress';

export function SellerOutcomeDialog({ leadId, leadName, revision, timeZone, disabled = false, onReload, onConflict, onClose, onSaved, onConsultationConfirmed }: {
  leadId: string; leadName: string; revision: number; timeZone: string;
  disabled?: boolean; onReload?: () => void; onConflict?: () => void;
  onClose: () => void; onSaved: () => void;
  onConsultationConfirmed: (eventId: string, leadRevision: number, startsAt: string) => void;
}) {
  const [startsAtLocal, setStartsAtLocal] = useState(() => localDateTimeInZone(new Date(Date.now() + 24 * 60 * 60 * 1000), timeZone, '09:00'));
  const [confirmationBasis, setConfirmationBasis] = useState<'customer_reply' | 'confirmed_booking'>('customer_reply');
  const [repeatedHourChoice, setRepeatedHourChoice] = useState<'earlier' | 'later' | ''>('');
  const [closedOn, setClosedOn] = useState(() => localDateTimeInZone(new Date(), timeZone).slice(0, 10));
  const [reference, setReference] = useState('');
  const [savedRevision, setSavedRevision] = useState(revision);
  const [outcomeRefresh, setOutcomeRefresh] = useState(0);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const retryKeys = useRef(new Map<string, string>());
  const inFlight = useRef(false);
  const blocked = busy || disabled;

  const currentRevision = Math.max(revision, savedRevision);
  let possibleStarts: Date[] = [];
  try { possibleStarts = possibleUtcInstantsForLocalDateTime(startsAtLocal, timeZone); } catch { /* the form reports invalid local times on submit */ }

  const submit = async (action: Record<string, unknown>, success: string, onResult?: (result: Record<string, unknown>) => void) => {
    if (disabled || inFlight.current) return null;
    const payload = { leadId, expectedRevision: currentRevision, ...action };
    const fingerprint = JSON.stringify(payload);
    retryKeys.current.set(fingerprint, retryKeys.current.get(fingerprint) || crypto.randomUUID());
    inFlight.current = true;
    setBusy(true); setError(''); setNotice('');
    try {
      const response = await fetch('/api/realtor/leads', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, requestKey: retryKeys.current.get(fingerprint) }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok || !body?.ok) {
        if (response.status === 409) onConflict?.();
        throw new Error(body?.error || 'Unable to record this seller outcome.');
      }
      retryKeys.current.delete(fingerprint);
      const result = body.result as Record<string, unknown>;
      if (Number.isInteger(result.leadRevision)) setSavedRevision(Number(result.leadRevision));
      setOutcomeRefresh((value) => value + 1);
      setNotice(success);
      onResult?.(result);
      onSaved();
      return result;
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to record this seller outcome.');
      return null;
    } finally { inFlight.current = false; setBusy(false); }
  };

  const confirmConsultation = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!possibleStarts.length) { setError('That local time does not exist because of a daylight-saving time change. Choose another time.'); return; }
    if (possibleStarts.length > 1 && !repeatedHourChoice) { setError('Choose which occurrence of this repeated local time the seller confirmed.'); return; }
    const startsAt = possibleStarts[repeatedHourChoice === 'later' ? possibleStarts.length - 1 : 0].toISOString();
    const result = await submit({ action: 'confirm_consultation', startsAt, confirmationBasis }, 'Consultation recorded. Review the matching appointment draft before adding it to your planner.', (saved) => {
      if (typeof saved.eventId === 'string' && Number.isInteger(saved.leadRevision)) onConsultationConfirmed(saved.eventId, Number(saved.leadRevision), startsAt);
    });
    if (result?.eventId) onClose();
  };

  const recordClosing = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!reference.trim()) return;
    const result = await submit({ action: 'record_closing', closedOn, reference: reference.trim() }, 'Seller closing recorded. You may record money received separately in Business.');
    if (result) setReference('');
  };

  return <ModalSurface labelId="seller-outcome-title" onClose={onClose}>
    <h2 id="seller-outcome-title" className="text-xl font-bold">Record seller outcomes</h2>
    <p className="mt-2 text-sm text-slate-400">For {leadName}. These entries record what you confirmed; they do not contact the seller or create a financial ledger entry.</p>
    {disabled ? <div className="mt-3 text-sm text-amber-100"><p role="status">Outcome actions are paused until the seller request is available and current.</p>
      {onReload ? <button type="button" disabled={busy} onClick={onReload} className="mt-2 underline">Reload seller request</button> : null}</div> : null}
    <form onSubmit={(event) => void confirmConsultation(event)} className="mt-5 space-y-3 rounded-xl border border-white/10 p-4">
      <h3 className="font-semibold">Confirm a consultation</h3>
      <label className="block text-xs text-slate-300">Confirmed start time ({timeZone})<input required type="datetime-local" value={startsAtLocal} onChange={(event) => setStartsAtLocal(event.target.value)} className="mt-1 w-full rounded-lg border border-white/15 bg-slate-950 px-3 py-2.5 text-sm text-white" /></label>
      {possibleStarts.length > 1 ? <label className="block text-xs text-slate-300">This local time occurs twice<select required value={repeatedHourChoice} onChange={(event) => setRepeatedHourChoice(event.target.value as typeof repeatedHourChoice)} className="mt-1 w-full rounded-lg border border-white/15 bg-slate-950 px-3 py-2.5 text-sm text-white"><option value="">Choose the confirmed occurrence</option><option value="earlier">Earlier occurrence · {possibleStarts[0].toLocaleTimeString(undefined, { timeZone, timeStyle: 'short' })} {new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: 'short' }).format(possibleStarts[0]).split(' ').at(-1)}</option><option value="later">Later occurrence · {possibleStarts.at(-1)?.toLocaleTimeString(undefined, { timeZone, timeStyle: 'short' })} {new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: 'short' }).format(possibleStarts.at(-1)).split(' ').at(-1)}</option></select></label> : null}
      <label className="block text-xs text-slate-300">Confirmation basis<select value={confirmationBasis} onChange={(event) => setConfirmationBasis(event.target.value as typeof confirmationBasis)} className="mt-1 w-full rounded-lg border border-white/15 bg-slate-950 px-3 py-2.5 text-sm text-white"><option value="customer_reply">Seller confirmed in a reply</option><option value="confirmed_booking">Existing booking confirmed</option></select></label>
      <button disabled={blocked} className="rounded-lg bg-cyan-300 px-4 py-2 text-sm font-bold text-slate-950 disabled:opacity-50">{busy ? 'Saving…' : 'Record consultation'}</button>
    </form>

    <section className="mt-4 rounded-xl border border-white/10 p-4"><h3 className="font-semibold">Cancel a consultation</h3>
      <SellerOutcomePicker key={`consultations:${currentRevision}:${outcomeRefresh}`} leadId={leadId} kind="consultation"
        timeZone={timeZone} disabled={blocked} onAction={(consultationEventId) => void submit({ action: 'cancel_consultation', consultationEventId },
          'Consultation cancellation recorded. Pending linked appointments and reminders are cancelled by the planner.')} />
    </section>

    <form onSubmit={(event) => void recordClosing(event)} className="mt-4 space-y-3 rounded-xl border border-white/10 p-4">
      <h3 className="font-semibold">Record a seller closing</h3>
      <label className="block text-xs text-slate-300">Actual closing date<input required type="date" value={closedOn} onChange={(event) => setClosedOn(event.target.value)} className="mt-1 w-full rounded-lg border border-white/15 bg-slate-950 px-3 py-2.5 text-sm text-white" /></label>
      <label className="block text-xs text-slate-300">Stable transaction reference<input required maxLength={120} value={reference} onChange={(event) => setReference(event.target.value)} className="mt-1 w-full rounded-lg border border-white/15 bg-slate-950 px-3 py-2.5 text-sm text-white" placeholder="Your transaction or file reference" /></label>
      <button disabled={blocked || !reference.trim()} className="rounded-lg bg-emerald-200 px-4 py-2 text-sm font-bold text-slate-950 disabled:opacity-50">{busy ? 'Saving…' : 'Record closing'}</button>
      <p className="text-xs leading-5 text-slate-500">This records a seller outcome only. Enter any received deposit separately in Business; use reference seller:{leadId}:{reference.trim() || 'transaction-reference'} when you choose to link that cash entry.</p>
    </form>

    <section className="mt-4 rounded-xl border border-white/10 p-4"><h3 className="font-semibold">Correct a recorded closing</h3>
      <label className="mt-2 block text-xs text-slate-300">Reason<textarea required maxLength={200} minLength={1} value={reason}
        onChange={(event) => setReason(event.target.value)} className="mt-1 w-full rounded-lg border border-white/15 bg-slate-950 px-3 py-2.5 text-sm text-white" /></label>
      <SellerOutcomePicker key={`closings:${currentRevision}:${outcomeRefresh}`} leadId={leadId} kind="closing"
        timeZone={timeZone} disabled={blocked} actionDisabled={!reason.trim()} onAction={(outcomeEventId) => void submit({ action: 'void_outcome', outcomeEventId, reason: reason.trim() },
          'Closing void recorded. The prior outcome remains in history.')} />
    </section>
    {error ? <p role="alert" className="mt-4 text-sm text-rose-200">{error}</p> : null}
    {notice ? <p role="status" className="mt-4 text-sm text-emerald-200">{notice}</p> : null}
    <button type="button" onClick={onClose} className="mt-5 rounded-lg border border-white/15 px-4 py-2 text-sm text-slate-200">Close</button>
  </ModalSurface>;
}
