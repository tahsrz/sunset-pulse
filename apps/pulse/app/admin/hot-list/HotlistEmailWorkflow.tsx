'use client';

import { useEffect, useState } from 'react';

type Profile = {
  agentName: string;
  brokerageName: string;
  licenseNumber: string;
  jurisdiction: string;
  serviceArea: string;
  replyToEmail: string;
  disclosureText: string;
  enabled: boolean;
  autoSend: boolean;
  maxRecipientsPerRun: number;
};

type WorkflowRun = {
  id: string;
  status: string;
  subject: string;
  body: string;
  recipientSnapshot: Array<{ name: string; email: string }>;
  skippedSnapshot?: { contacts?: Array<{ reason: string }> };
  approvalRequired: boolean;
  error?: string | null;
};

const emptyProfile: Profile = {
  agentName: '', brokerageName: '', licenseNumber: '', jurisdiction: 'Texas', serviceArea: 'North Texas',
  replyToEmail: '', disclosureText: 'Listing information should be independently verified. This message is for client communication and is not a contract or offer.',
  enabled: false, autoSend: false, maxRecipientsPerRun: 25,
};

export function HotlistEmailWorkflow() {
  const [profile, setProfile] = useState<Profile>(emptyProfile);
  const [run, setRun] = useState<WorkflowRun | null>(null);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void fetch('/api/admin/automations/hotlist-email', { cache: 'no-store' })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload?.message || 'Unable to load workflow settings.');
        if (payload.data.settings) setProfile(payload.data.settings);
        const latest = payload.data.runs?.[0];
        if (latest) setRun(latest);
      })
      .catch((loadError) => setError(loadError instanceof Error ? loadError.message : 'Unable to load workflow settings.'));
  }, []);

  const update = <K extends keyof Profile>(key: K, value: Profile[K]) => setProfile((current) => ({ ...current, [key]: value }));

  const saveProfile = async () => {
    setBusy(true); setError(''); setStatus('');
    try {
      const response = await fetch('/api/admin/automations/hotlist-email', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'save_settings', ...profile }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.message || 'Unable to save workflow settings.');
      setStatus('Licensed workflow profile saved.');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save workflow settings.');
    } finally { setBusy(false); }
  };

  const runWorkflow = async () => {
    const confirmAutoSend = profile.autoSend && window.confirm('This profile has auto-send enabled. Send the consented recipient list now through the configured email provider?');
    if (profile.autoSend && !confirmAutoSend) return;
    setBusy(true); setError(''); setStatus('');
    try {
      const response = await fetch('/api/admin/automations/hotlist-email', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'run', confirmAutoSend }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.message || 'Unable to run hot-list email workflow.');
      setRun(payload.data.run);
      setStatus(payload.data.autoSent ? 'Email sent to the consented contact list.' : 'Draft created. Review it, then approve the send.');
    } catch (runError) {
      setError(runError instanceof Error ? runError.message : 'Unable to run hot-list email workflow.');
    } finally { setBusy(false); }
  };

  const approveAndSend = async () => {
    if (!run || !window.confirm('Approve this exact draft and send it as a blind-copy email to the eligible contacts?')) return;
    setBusy(true); setError(''); setStatus('');
    try {
      const response = await fetch('/api/admin/automations/hotlist-email', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'send', runId: run.id, confirm: true }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.message || 'Unable to send approved workflow draft.');
      setRun(payload.data.run);
      setStatus('Approved draft sent. The provider receipt is recorded in the workflow audit.');
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : 'Unable to send approved workflow draft.');
    } finally { setBusy(false); }
  };

  return <section className="rounded-[2rem] border border-amber-200/20 bg-amber-500/[0.06] p-6 text-slate-100">
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-amber-200">P8 · Licensed workflow</p>
        <h2 className="mt-2 text-2xl font-black text-white">Hot list → consented contact email</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">The workflow reads this verified MLS hot list and existing leads, excludes opt-outs and contacts without explicit email consent, then creates an auditable draft. Recipients are sent as BCC.</p>
      </div>
      <div className="flex gap-2">
        <button type="button" disabled={busy} onClick={saveProfile} className="rounded-xl border border-amber-200/30 px-4 py-3 text-xs font-black uppercase tracking-[0.15em] text-amber-100 disabled:opacity-50">Save profile</button>
        <button type="button" disabled={busy} onClick={runWorkflow} className="rounded-xl bg-amber-300 px-4 py-3 text-xs font-black uppercase tracking-[0.15em] text-amber-950 disabled:opacity-50">{busy ? 'Working…' : 'Run workflow'}</button>
      </div>
    </div>

    <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Field label="Agent name" value={profile.agentName} onChange={(value) => update('agentName', value)} />
      <Field label="Brokerage" value={profile.brokerageName} onChange={(value) => update('brokerageName', value)} />
      <Field label="License number" value={profile.licenseNumber} onChange={(value) => update('licenseNumber', value)} />
      <Field label="Reply-to email" value={profile.replyToEmail} onChange={(value) => update('replyToEmail', value)} type="email" />
      <Field label="Jurisdiction" value={profile.jurisdiction} onChange={(value) => update('jurisdiction', value)} />
      <Field label="Service area" value={profile.serviceArea} onChange={(value) => update('serviceArea', value)} />
      <Field label="Max recipients / run" value={String(profile.maxRecipientsPerRun)} onChange={(value) => update('maxRecipientsPerRun', Number(value) || 1)} type="number" />
      <label className="flex items-center gap-3 rounded-xl border border-white/10 bg-slate-950/50 px-3 py-3 text-xs text-slate-200"><input type="checkbox" checked={profile.enabled} onChange={(event) => update('enabled', event.target.checked)} /> Enable workflow</label>
    </div>
    <label className="mt-4 flex items-start gap-3 rounded-xl border border-amber-200/20 bg-slate-950/40 p-3 text-xs leading-5 text-amber-100"><input type="checkbox" checked={profile.autoSend} onChange={(event) => update('autoSend', event.target.checked)} className="mt-1" /><span><strong>Opt in to auto-send.</strong> Manual console runs still ask for confirmation. When enabled and saved, the hourly scheduler may send only when the verified MLS/contact snapshot changes.</span></label>
    <label className="mt-4 block text-xs font-bold text-slate-300">Required disclosure<textarea value={profile.disclosureText} onChange={(event) => update('disclosureText', event.target.value)} maxLength={1200} rows={3} className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950/70 p-3 text-sm text-white outline-none focus:border-amber-200/50" /></label>

    {error ? <p className="mt-4 rounded-xl border border-red-200/20 bg-red-500/10 p-3 text-sm font-bold text-red-100">{error}</p> : null}
    {status ? <p role="status" className="mt-4 rounded-xl border border-emerald-200/20 bg-emerald-500/10 p-3 text-sm font-bold text-emerald-100">{status}</p> : null}
    {run ? <div className="mt-5 rounded-2xl border border-white/10 bg-slate-950/60 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Latest run · {run.status}</p><h3 className="mt-1 text-lg font-black text-white">{run.subject}</h3></div>{run.status === 'draft' ? <button type="button" disabled={busy} onClick={approveAndSend} className="rounded-lg border border-emerald-200/30 px-3 py-2 text-xs font-black uppercase text-emerald-100 disabled:opacity-50">Approve &amp; send</button> : null}</div>
      <p className="mt-3 text-xs text-slate-400">{run.recipientSnapshot?.length || 0} eligible recipient(s) · {run.skippedSnapshot?.contacts?.length || 0} excluded by consent/compliance rules.</p>
      <pre className="mt-4 max-h-72 overflow-auto whitespace-pre-wrap rounded-xl border border-white/10 bg-black/20 p-4 text-xs leading-6 text-slate-200">{run.body}</pre>
      {run.error ? <p className="mt-3 text-xs text-red-200">{run.error}</p> : null}
    </div> : null}
    <p className="mt-5 text-[11px] leading-5 text-slate-400">This is a communication workflow only. It does not make offers, negotiate, sign contracts, publish MLS changes, represent a client without authorization, or move money.</p>
  </section>;
}

function Field({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return <label className="block text-xs font-bold text-slate-300">{label}<input type={type} value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-3 text-sm text-white outline-none focus:border-amber-200/50" /></label>;
}
