'use client';

import React, { useState } from 'react';
import type { SellerServiceAction } from '@/lib/realtor-workspace/sellerServiceContract';
import { SellerActionDrawer } from './SellerActionDrawer';

type MessageAction = Extract<SellerServiceAction, { action: 'record_message' | 'send_email' }> extends infer T
  ? T extends SellerServiceAction ? Omit<T, 'leadId' | 'expectedRevision' | 'requestKey'> : never
  : never;
type Mode = 'record' | 'email';
const inputClass = 'mt-1 w-full rounded-lg border border-white/20 bg-slate-950 p-3 text-sm';
const buttonClass = 'rounded-lg border border-cyan-300/30 px-4 py-2 text-sm font-semibold text-cyan-100 disabled:opacity-50';

export function SellerConversationComposer({
  recipient,
  sender,
  contactAllowed,
  emailEnabled,
  expectedLeadRevision,
  busy,
  disabled,
  saveBlocked,
  error,
  onClearError,
  onSave,
}: {
  recipient: string | null;
  sender: string | null;
  contactAllowed: boolean;
  emailEnabled: boolean;
  expectedLeadRevision: number;
  busy: boolean;
  disabled: boolean;
  saveBlocked: boolean;
  error: string;
  onClearError: () => void;
  onSave: (action: MessageAction) => Promise<boolean>;
}) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>('record');
  const [direction, setDirection] = useState<'inbound' | 'outbound'>('inbound');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [occurredAt, setOccurredAt] = useState('');
  const [reviewing, setReviewing] = useState(false);
  const [reviewed, setReviewed] = useState(false);
  const dirty = Boolean(subject || body || occurredAt);

  const close = () => {
    setOpen(false);
    setMode('record');
    setDirection('inbound');
    setSubject('');
    setBody('');
    setOccurredAt('');
    setReviewing(false);
    setReviewed(false);
    onClearError();
  };
  const saveAction = async () => {
    if (mode === 'email') {
      if (!reviewing) {
        if (!subject.trim() || !body.trim() || !recipient || !contactAllowed || !emailEnabled) {
          onClearError();
          return false;
        }
        setReviewing(true);
        setReviewed(false);
        return false;
      }
      if (!reviewed) return false;
      const saved = await onSave({ action: 'send_email', reviewed: true, expectedLeadRevision, subject: subject.trim(), body: body.trim() });
      if (saved) close();
      return saved;
    }
    if (!subject.trim() || !body.trim() || !occurredAt.trim()) return false;
    const saved = await onSave({ action: 'record_message', direction, subject: subject.trim(), body: body.trim(), occurredAt: occurredAt.trim() });
    if (saved) close();
    return saved;
  };

  return <>
    <div className="mt-4 flex flex-wrap gap-2">
      <button type="button" className={buttonClass} disabled={disabled} onClick={() => { setMode('record'); setOpen(true); }}>Record a conversation</button>
      <button type="button" className={buttonClass} disabled={disabled || !contactAllowed || !emailEnabled || !recipient} onClick={() => { setMode('email'); setOpen(true); }}>Write an email</button>
    </div>
    {!emailEnabled ? <p className="mt-2 text-xs text-slate-400">Email sending is not set up. Use your verified mailbox, then record the conversation here.</p> : null}
    {!contactAllowed ? <p className="mt-2 text-xs text-amber-200">This request does not currently allow another email. Check its contact permission in the inbox.</p> : null}
    {open ? <SellerActionDrawer titleId="seller-conversation-title" title={mode === 'email' ? 'Write an email' : 'Record a conversation'}
      description={mode === 'email' ? 'Review the exact message and recipient before it enters the sending queue.' : 'Record a reply or an email already sent. Include the exact local date and time with its UTC offset.'}
      unsavedDescription="This conversation draft has not been saved to the case." dirty={dirty} busy={busy} saveBlocked={saveBlocked} error={error}
      onClose={close} onSave={async () => { if (mode === 'email') { setReviewing(true); setReviewed(false); return false; } return saveAction(); }} onDiscard={close}>
      <div className="mt-5 space-y-4">
        <div className="rounded-lg border border-white/15 bg-white/5 p-3 text-sm">
          <p>Recipient: <strong>{recipient || 'No email recorded'}</strong></p>
          <p className="mt-1 text-xs text-slate-400">Sender: {sender || 'Not configured'}. Replies go to your verified account mailbox.</p>
        </div>
        {!contactAllowed ? <p className="text-sm text-amber-200">This request does not allow another email. Review its contact permission and replies in the inbox.</p> : null}
        {!emailEnabled && mode === 'email' ? <p className="text-sm text-amber-200">Email sending is not configured. Use your verified mailbox, then record the conversation here.</p> : null}
        {mode === 'record' ? <>
          <label className="block text-sm">What happened?<select className={inputClass} value={direction} disabled={disabled} onChange={(event) => { setDirection(event.target.value as typeof direction); onClearError(); }}><option value="inbound">I received a reply</option><option value="outbound">I already sent an email</option></select></label>
          <label className="block text-sm">Subject<input className={inputClass} required maxLength={200} value={subject} disabled={disabled} onChange={(event) => { setSubject(event.target.value); onClearError(); }} /></label>
          <label className="block text-sm">Message<textarea className={inputClass} required maxLength={8000} rows={5} value={body} disabled={disabled} onChange={(event) => { setBody(event.target.value); onClearError(); }} /></label>
          <label className="block text-sm">Exact date and time, including UTC offset<input className={inputClass} required value={occurredAt} disabled={disabled} placeholder="2026-10-19T09:30:00-05:00" onChange={(event) => { setOccurredAt(event.target.value); onClearError(); }} /></label>
          <p className="text-xs text-slate-400">Use the timestamp from the message or your sent-mail record. An offset such as -05:00 identifies the time zone difference.</p>
          <button type="button" className={buttonClass} disabled={disabled} onClick={() => void saveAction()}>Save conversation</button>
        </> : <>
          {!reviewing ? <>
            <label className="block text-sm">Subject<input className={inputClass} required maxLength={200} value={subject} disabled={disabled} onChange={(event) => { setSubject(event.target.value); onClearError(); }} /></label>
            <label className="block text-sm">Message<textarea className={inputClass} required maxLength={8000} rows={7} value={body} disabled={disabled} onChange={(event) => { setBody(event.target.value); onClearError(); }} /></label>
            <button type="button" className={buttonClass} disabled={disabled || !subject.trim() || !body.trim() || !contactAllowed || !emailEnabled || !recipient} onClick={() => { setReviewing(true); setReviewed(false); }}>Review exact email</button>
          </> : <section className="space-y-3 rounded-xl border border-cyan-200/20 bg-cyan-100/5 p-4" aria-label="Email review">
            <h3 className="font-semibold">Check this exact email</h3>
            <p className="text-sm">To: <strong>{recipient}</strong></p><p className="text-sm">From: {sender || 'Not configured'}</p>
            <p className="text-sm font-semibold">{subject}</p><p className="whitespace-pre-wrap break-words text-sm">{body}</p>
            <p className="text-xs text-slate-300">Queueing starts the shared email worker. It checks contact permission again before sending. Queueing does not prove delivery.</p>
            <label className="flex gap-2 text-sm"><input type="checkbox" checked={reviewed} disabled={disabled} onChange={(event) => { setReviewed(event.target.checked); onClearError(); }} />I reviewed this exact message and recipient.</label>
            <div className="flex flex-wrap gap-2"><button type="button" className={buttonClass} disabled={disabled || !reviewed} onClick={() => void saveAction()}>Queue reviewed email</button><button type="button" className="text-sm text-cyan-200 underline" disabled={disabled} onClick={() => { setReviewing(false); setReviewed(false); }}>Back to edit</button></div>
          </section>}
        </>}
      </div>
    </SellerActionDrawer> : null}
  </>;
}
