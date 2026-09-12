'use client';

import { useEffect, useState } from 'react';
import type { AgentRun } from '@/lib/agent-workspace/types';

type SavedEmailRun = {
  id: string;
  status: string;
  subject: string;
  body: string;
  recipientSnapshot?: Array<{ email: string }>;
  skippedSnapshot?: { contacts?: Array<unknown> };
  error?: string | null;
};

export function AgentEmailDraft({ run }: { run: AgentRun }) {
  const response = run.response;
  const emailIntent = run.request?.selectedWorkerId === 'follow-up-writer' || /\b(email|inbox|contact list|send to all)\b/i.test(run.submittedText);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [savedRun, setSavedRun] = useState<SavedEmailRun | null>(null);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!response) return;
    setSubject(response.result.deliverable.title || 'Follow-up from Sunset Pulse');
    setBody(response.result.deliverable.copyReadyText);
    setSavedRun(null);
    setStatus('');
    setError('');
  }, [response, response?.commandId]);

  if (!response || !emailIntent) return null;

  const saveDraft = async () => {
    setBusy(true); setError(''); setStatus('');
    try {
      const response = await fetch('/api/admin/automations/hotlist-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save_agent_draft', subject, body, sourceRunId: run.id }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.message || 'Unable to save the agent email draft.');
      setSavedRun(payload.data.run);
      setStatus(payload.data.reused ? 'This exact email draft is already saved.' : 'Draft saved with the current eligible audience.');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save the agent email draft.');
    } finally { setBusy(false); }
  };

  const sendToAll = async () => {
    if (!savedRun || !window.confirm(`Send this exact draft to ${savedRun.recipientSnapshot?.length || 0} eligible contacts as BCC?`)) return;
    setBusy(true); setError(''); setStatus('');
    try {
      const response = await fetch('/api/admin/automations/hotlist-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'send', runId: savedRun.id, confirm: true }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.message || 'Unable to send the approved email.');
      setSavedRun(payload.data.run);
      setStatus('Email sent. The provider receipt is recorded in the workflow audit.');
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : 'Unable to send the approved email.');
    } finally { setBusy(false); }
  };

  return <section aria-label="Agent email draft" className="rounded-lg border border-fuchsia-200/25 bg-fuchsia-200/[0.05] p-4">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div><p className="text-[10px] font-black uppercase tracking-[0.18em] text-fuchsia-200">Agent-written email</p><h3 className="mt-1 text-lg font-black text-white">Review before sending</h3><p className="mt-1 text-xs leading-5 text-slate-300">Edit the worker’s draft, save the exact version, then send it to all eligible contacts as BCC.</p></div>
      <div className="flex gap-2"><button type="button" onClick={() => void saveDraft()} disabled={busy || !subject.trim() || !body.trim()} className="min-h-10 rounded border border-fuchsia-200/30 px-3 text-xs font-black uppercase text-fuchsia-100 disabled:opacity-50">{busy ? 'Working…' : 'Save draft'}</button>{savedRun?.status === 'draft' ? <button type="button" onClick={() => void sendToAll()} disabled={busy} className="min-h-10 rounded bg-emerald-300 px-3 text-xs font-black uppercase text-emerald-950 disabled:opacity-50">Send to all eligible</button> : null}</div>
    </div>
    <label className="mt-4 block text-xs font-bold text-slate-300">Subject<input value={subject} onChange={(event) => { setSubject(event.target.value); setSavedRun(null); }} maxLength={300} className="mt-2 w-full rounded border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none focus:border-fuchsia-200/50" /></label>
    <label className="mt-3 block text-xs font-bold text-slate-300">Message<textarea value={body} onChange={(event) => { setBody(event.target.value); setSavedRun(null); }} maxLength={12000} rows={10} className="mt-2 w-full resize-y rounded border border-white/10 bg-slate-950/70 p-3 text-sm leading-6 text-white outline-none focus:border-fuchsia-200/50" /></label>
    {savedRun ? <p className="mt-3 text-xs text-slate-300">{savedRun.recipientSnapshot?.length || 0} eligible recipient(s) · {savedRun.skippedSnapshot?.contacts?.length || 0} excluded by consent/compliance rules · status: {savedRun.status}</p> : null}
    {error ? <p className="mt-3 rounded border border-red-200/20 bg-red-500/10 p-3 text-xs font-bold text-red-100">{error}</p> : null}
    {status ? <p role="status" className="mt-3 rounded border border-emerald-200/20 bg-emerald-500/10 p-3 text-xs font-bold text-emerald-100">{status}</p> : null}
    <p className="mt-3 text-[11px] leading-5 text-slate-400">The agent may draft language; only your explicit approval can send it. Sending does not authorize offers, negotiation, contracts, MLS changes, or funds movement.</p>
  </section>;
}
