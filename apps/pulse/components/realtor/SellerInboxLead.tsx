'use client';

import React, { useId, useRef, useState } from 'react';
import Link from 'next/link';
import { ownedSellerLeadPageSchema, type OwnedSellerLead } from '@/lib/realtor-workspace/leadContracts';
import { resolveLeadExecutionIntent } from '@/lib/sites/leadExecutionIntent';
import { readSellerLeadContext } from '@/lib/sites/sellerLeadContext';
import { SellerLeadScheduleDialog } from './SellerLeadScheduleDialog';
import { SellerOutcomeDialog } from './SellerOutcomeDialog';
import { SellerOutcomePicker } from './SellerOutcomePicker';
import { ModalSurface } from './ModalSurface';
import { sellerReceiptTime } from '@/lib/realtor-workspace/sellerReceiptTime';
import { possibleUtcInstantsForLocalDateTime } from '@/lib/realtor-workspace/progress';

type Schedule = { actionKey: 'initial-response:v1' | `reply:${string}` | `consultation:${string}`; revision: number; startsAt?: string };
const buttonClass = 'rounded-lg border border-white/15 px-3 py-2 text-sm disabled:opacity-50';

export function SellerInboxLead({ lead, timeZone }: { lead: OwnedSellerLead; timeZone: string }) {
  const permissionTitleId = useId();
  const [snapshot, setSnapshot] = useState<OwnedSellerLead | null>(lead);
  const [busy, setBusy] = useState(false);
  const [needsRefresh, setNeedsRefresh] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [outcomes, setOutcomes] = useState(false);
  const [appointments, setAppointments] = useState(false);
  const [revokePermission, setRevokePermission] = useState(false);
  const [occurredAtLocal, setOccurredAtLocal] = useState('');
  const [repeatedHour, setRepeatedHour] = useState<'' | 'earlier' | 'later'>('');
  const retryActions = useRef(new Map<string, { requestKey: string; occurredAt: string }>());
  const scheduleKeys = useRef(new Map<string, string>());

  const refreshSnapshot = async () => {
    setNeedsRefresh(true);
    try {
      const response = await fetch(`/api/realtor/leads?leadId=${encodeURIComponent(lead.id)}`, { cache: 'no-store' });
      const body = await response.json();
      if (!response.ok || !body?.ok) throw new Error('Reload this request before recording another action.');
      const page = ownedSellerLeadPageSchema.parse(body.result);
      setSnapshot(page.leads.find((item) => item.id === lead.id) || null);
      setNeedsRefresh(false);
      return true;
    } catch {
      setError('Reload this request before recording another action.');
      return false;
    }
  };

  const record = async (action: 'record_contact' | 'record_response' | 'revoke_requested_contact') => {
    if (!snapshot || busy || needsRefresh) return;
    const fingerprint = `${snapshot.id}:${snapshot.revision}:${action}:${action === 'revoke_requested_contact' ? '' : `${timeZone}:${occurredAtLocal}:${repeatedHour}`}`;
    let occurredAt: string;
    try { occurredAt = action === 'revoke_requested_contact' ? new Date().toISOString()
      : sellerReceiptTime(occurredAtLocal, timeZone, repeatedHour, snapshot.created_at); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Choose a valid action time.'); return; }
    const retry = retryActions.current.get(fingerprint) || { requestKey: crypto.randomUUID(), occurredAt };
    retryActions.current.set(fingerprint, retry);
    setBusy(true); setError(''); setNotice('');
    try {
      const response = await fetch('/api/realtor/leads', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId: snapshot.id, expectedRevision: snapshot.revision, action, requestKey: retry.requestKey,
          ...(action === 'record_contact' ? { channel: 'email', occurredAt: retry.occurredAt }
            : action === 'record_response' ? { source: 'customer_reply', occurredAt: retry.occurredAt } : {}) }) });
      const body = await response.json();
      if (!response.ok || !body?.ok) {
        if (response.status === 409) setNeedsRefresh(true);
        throw new Error(body?.error || 'This action could not be recorded.');
      }
      retryActions.current.delete(fingerprint);
      if (action !== 'revoke_requested_contact') { setOccurredAtLocal(''); setRepeatedHour(''); }
      setNotice(action === 'record_contact' ? 'Email contact attempt recorded.' : action === 'record_response'
        ? 'Customer reply recorded. You can schedule its follow-up.' : 'Requested-contact permission revoked. Linked seller reminders were cancelled.');
      if (action === 'revoke_requested_contact') { setRevokePermission(false); setSchedule(null); setAppointments(false); }
      if (action === 'record_response' && typeof body.result?.eventId === 'string' && Number.isInteger(body.result?.leadRevision)) {
        setSchedule({ actionKey: `reply:${body.result.eventId}`, revision: body.result.leadRevision });
      }
      await refreshSnapshot();
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'This action could not be recorded.'); }
    finally { setBusy(false); }
  };

  if (!snapshot) return <p role="status" className="rounded-xl border border-white/15 p-4 text-sm">This seller request is no longer available to your workspace.</p>;
  const pipelineLead = { ...snapshot, status: snapshot.status === 'reviewed' ? 'new' as const : snapshot.status };
  const intent = resolveLeadExecutionIntent(pipelineLead, null, 'Agent');
  const closed = snapshot.status === 'closed' || snapshot.status === 'archived';
  const requestedContact = readSellerLeadContext(pipelineLead)?.requestedContact === true;
  const canScheduleFollowUp = !closed && requestedContact;
  const canScheduleInitialResponse = canScheduleFollowUp && snapshot.contact_attempted_at === null;
  const disabled = busy || needsRefresh;
  let repeatedTime = false;
  try { repeatedTime = Boolean(occurredAtLocal && possibleUtcInstantsForLocalDateTime(occurredAtLocal, timeZone).length > 1); } catch { /* recording reports invalid times */ }

  return <article aria-label={`Seller request from ${snapshot.name}`} className="min-w-0 rounded-2xl border border-white/10 bg-slate-900/80 p-5">
    <div className="flex flex-wrap items-start justify-between gap-3"><div>
      <h2 className="break-words text-lg font-bold">{snapshot.name}</h2>
      <Link href={`/seller-cases/${encodeURIComponent(snapshot.id)}`} className="mt-2 inline-block text-sm font-semibold text-cyan-200 underline">Open seller case →</Link>
      <p className="mt-1 text-xs text-slate-400">{new Date(snapshot.created_at).toLocaleString(undefined, { timeZone })} · {snapshot.status || 'new'}</p>
    </div><span className="text-xs text-slate-500">{snapshot.site}</span></div>
    <p className="mt-3 whitespace-pre-wrap break-words text-sm text-slate-300">{snapshot.message}</p>
    <p className="mt-3 text-sm text-cyan-100">{intent.recommendation}</p>
    <p className="mt-2 text-xs text-slate-400">Requested-contact permission: {requestedContact ? 'active' : 'not active'}.</p>
    <details className="mt-3 rounded-xl border border-white/10 p-3 text-xs text-slate-300">
      <summary className="cursor-pointer font-semibold">Record an earlier contact or reply</summary>
      <p className="mt-2">Leave the time blank to record now. Otherwise choose when the email contact or customer reply actually happened, then use its record button below.</p>
      <label className="mt-3 block">Contact or reply time ({timeZone})<input type="datetime-local" disabled={disabled} value={occurredAtLocal}
        onChange={(event) => { setOccurredAtLocal(event.target.value); setRepeatedHour(''); }} className="mt-1 w-full min-w-0 rounded-lg border border-white/15 bg-slate-950 px-3 py-2" /></label>
      {repeatedTime ? <label className="mt-3 block">Occurrence of the repeated hour<select disabled={disabled} value={repeatedHour} onChange={(event) => setRepeatedHour(event.target.value as typeof repeatedHour)} className="mt-1 w-full rounded-lg border border-white/15 bg-slate-950 px-3 py-2"><option value="">Choose the occurrence</option><option value="earlier">Earlier occurrence</option><option value="later">Later occurrence</option></select></label> : null}
      {occurredAtLocal ? <button type="button" disabled={disabled} onClick={() => { setOccurredAtLocal(''); setRepeatedHour(''); }} className="mt-2 text-cyan-200 underline">Use current time</button> : null}
    </details>
    <div className="mt-4 flex flex-wrap gap-2">
      {intent.href && !disabled ? <a href={intent.href} className={buttonClass}>Open seller email draft</a> : null}
      <button type="button" disabled={disabled || intent.type === 'unavailable'} onClick={() => void record('record_contact')} className={buttonClass}>Record email contact</button>
      <button type="button" disabled={disabled || closed} onClick={() => void record('record_response')} className={buttonClass}>Record customer reply</button>
      <button type="button" disabled={disabled || !canScheduleInitialResponse} onClick={() => setSchedule({ actionKey: 'initial-response:v1', revision: snapshot.revision })} className={buttonClass}>Schedule response</button>
      <button type="button" disabled={disabled || snapshot.status === 'archived'} onClick={() => setOutcomes(true)} className={buttonClass}>Record seller outcomes</button>
      <button type="button" disabled={disabled || !canScheduleFollowUp} aria-expanded={appointments}
        onClick={() => setAppointments((value) => !value)} className={buttonClass}>Schedule confirmed consultation</button>
      {requestedContact ? <button type="button" disabled={disabled} onClick={() => setRevokePermission(true)} className={buttonClass}>Revoke requested contact</button> : null}
    </div>
    {appointments ? <section aria-label="Schedule a confirmed consultation" className="mt-4 rounded-xl border border-white/10 p-3">
      <h3 className="text-sm font-semibold">Confirmed consultation appointments</h3>
      <p className="mt-1 text-xs text-slate-400">Choose an active confirmation. The appointment keeps its confirmed time.</p>
      <SellerOutcomePicker key={`${snapshot.id}:${snapshot.revision}`} leadId={snapshot.id} kind="consultation" timeZone={timeZone}
        disabled={disabled} actionDisabled={!canScheduleFollowUp} actionLabel="Schedule consultation appointment"
        onAction={(eventId, event) => setSchedule({ actionKey: `consultation:${eventId}`, revision: snapshot.revision, startsAt: event.occurred_at })} />
    </section> : null}
    <section aria-label="Recent recorded seller activity" className="mt-4 rounded-xl border border-white/10 p-3">
      <h3 className="text-sm font-semibold">Recent recorded activity</h3>
      <p className="mt-1 text-xs text-slate-400">Up to 20 recent receipts. Scheduling a follow-up does not record another customer reply.</p>
      {snapshot.sellerOutcomeEvents.length ? <ul className="mt-3 space-y-3">{snapshot.sellerOutcomeEvents.map((event) => <li key={event.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <div><span>{activityLabel(event.event_type)}</span><time dateTime={event.occurred_at} className="mt-1 block text-xs text-slate-400">{new Date(event.occurred_at).toLocaleString(undefined, { timeZone })}</time></div>
        {event.event_type === 'customer_replied' ? <button type="button" disabled={disabled || !canScheduleFollowUp} className={buttonClass}
          aria-label={`Schedule follow-up for reply ${new Date(event.occurred_at).toLocaleString(undefined, { timeZone })}`}
          onClick={() => setSchedule({ actionKey: `reply:${event.id}`, revision: snapshot.revision })}>Schedule reply follow-up</button> : null}
      </li>)}</ul> : <p className="mt-3 text-xs text-slate-400">No activity has been recorded yet.</p>}
    </section>
    {error ? <p role="alert" className="mt-3 text-sm text-rose-200">{error}</p> : null}
    {notice ? <p role="status" className="mt-3 text-sm text-emerald-200">{notice}</p> : null}
    {needsRefresh ? <button type="button" disabled={busy} onClick={() => { setBusy(true); setError(''); void refreshSnapshot().finally(() => setBusy(false)); }} className={`${buttonClass} mt-3`}>Reload seller request</button> : null}
    {revokePermission ? <ModalSurface labelId={permissionTitleId} onClose={() => { if (!busy) setRevokePermission(false); }}>
      <h2 id={permissionTitleId} className="text-xl font-bold">Revoke requested contact for {snapshot.name}?</h2>
      <p className="mt-3 text-sm text-slate-300">Record this when the seller withdraws permission to respond to this request. Linked seller reminders will be cancelled. Separate marketing permission remains unchanged.</p>
      {error ? <p role="alert" className="mt-3 text-sm text-rose-200">{error}</p> : null}
      <div className="mt-5 flex flex-wrap gap-2"><button type="button" disabled={disabled} onClick={() => void record('revoke_requested_contact')} className={buttonClass}>Confirm contact revocation</button>
        <button type="button" disabled={busy} onClick={() => setRevokePermission(false)} className={buttonClass}>Keep requested contact</button></div>
    </ModalSurface> : null}
    {schedule && canScheduleFollowUp && (schedule.actionKey !== 'initial-response:v1' || canScheduleInitialResponse) ? <SellerLeadScheduleDialog leadId={snapshot.id} leadName={snapshot.name} leadRevision={snapshot.revision}
      timeZone={timeZone} retryRequests={scheduleKeys.current} actionKey={schedule.actionKey} consultationStartsAt={schedule.startsAt}
      disabled={disabled} onConflict={() => setNeedsRefresh(true)}
      onReload={async () => { setBusy(true); setError(''); try { return await refreshSnapshot(); } finally { setBusy(false); } }}
      onClose={() => setSchedule(null)} onSaved={() => { setSchedule(null); void refreshSnapshot(); }} /> : null}
    {outcomes ? <SellerOutcomeDialog leadId={snapshot.id} leadName={snapshot.name} revision={snapshot.revision} timeZone={timeZone}
      disabled={disabled || snapshot.status === 'archived'} onConflict={() => setNeedsRefresh(true)}
      onReload={() => { setBusy(true); setError(''); void refreshSnapshot().finally(() => setBusy(false)); }}
      onClose={() => setOutcomes(false)} onSaved={() => { void refreshSnapshot(); }}
      onConsultationConfirmed={(eventId, revision, startsAt) => setSchedule({ actionKey: `consultation:${eventId}`, revision, startsAt })} /> : null}
  </article>;
}

function activityLabel(eventType: string) {
  return ({ contact_attempted: 'Email contact attempt', customer_replied: 'Customer reply',
    consultation_confirmed: 'Consultation confirmed', consultation_cancelled: 'Consultation cancelled',
    closing_recorded: 'Closing recorded', outcome_voided: 'Outcome voided',
    contact_permission_revoked: 'Requested contact revoked' } as Record<string, string>)[eventType] || 'Seller activity recorded';
}
