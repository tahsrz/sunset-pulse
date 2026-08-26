'use client';

import { useState } from 'react';
import { FileSignature, Mail, Send } from 'lucide-react';

const today = new Date().toISOString().slice(0, 10);
const ninetyDays = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

export default function RepresentationAgreementPage() {
  const [form, setForm] = useState({ clientName: '', clientEmail: '', brokerLegalName: '', brokerLicenseNumber: '', agentName: '', agentLicenseNumber: '', marketArea: 'Dallas-Fort Worth, Texas', representationType: 'buyer', exclusivity: 'non_exclusive', startsOn: today, endsOn: ninetyDays, compensation: 'Compensation to be agreed in writing before services begin.', intermediaryConsent: false });
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [signingUrl, setSigningUrl] = useState('');

  const update = (name: string, value: string | boolean) => setForm((current) => ({ ...current, [name]: value }));
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setState('sending');
    setMessage('');
    const response = await fetch('/api/signing/representation', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    const payload = await response.json().catch(() => null);
    if (!response.ok) { setState('error'); setMessage(payload?.error || 'Unable to send the agreement.'); return; }
    setState('sent');
    setSigningUrl(payload.signingUrl || '');
    setMessage(`Agreement sent to ${form.clientEmail}.`);
  };

  return <main className="min-h-screen bg-[#071013] px-5 py-8 text-slate-100 sm:px-8"><div className="mx-auto max-w-5xl"><header className="border-b border-white/10 pb-6"><p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-cyan-200"><FileSignature size={16} />Representation agreement</p><h1 className="mt-3 text-4xl font-black text-white">Define the relationship, then send it.</h1><p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300">Creates a buyer or tenant representation draft with fiduciary duties, scope, compensation, intermediary consent, and a secure electronic-signature link.</p><p className="mt-3 border-l-2 border-amber-300 pl-3 text-xs leading-6 text-amber-100">Attorney and responsible-broker review required before production use. This does not replace the TREC Information About Brokerage Services notice.</p></header>
  <form onSubmit={submit} className="mt-7 grid gap-6 lg:grid-cols-2"><section className="space-y-4"><h2 className="text-sm font-black uppercase tracking-[0.14em] text-white">Client and representation</h2><Field label="Client name" name="clientName" value={form.clientName} onChange={update} /><Field label="Send to email" name="clientEmail" type="email" value={form.clientEmail} onChange={update} /><Field label="Market area" name="marketArea" value={form.marketArea} onChange={update} /><div className="grid grid-cols-2 gap-3"><Select label="Client role" name="representationType" value={form.representationType} options={[['buyer','Buyer'],['tenant','Tenant']]} onChange={update} /><Select label="Relationship" name="exclusivity" value={form.exclusivity} options={[['non_exclusive','Non-exclusive'],['exclusive','Exclusive']]} onChange={update} /></div><div className="grid grid-cols-2 gap-3"><Field label="Starts" name="startsOn" type="date" value={form.startsOn} onChange={update} /><Field label="Ends" name="endsOn" type="date" value={form.endsOn} onChange={update} /></div></section>
  <section className="space-y-4"><h2 className="text-sm font-black uppercase tracking-[0.14em] text-white">Broker and agent</h2><Field label="Broker legal name" name="brokerLegalName" value={form.brokerLegalName} onChange={update} /><Field label="Broker license number" name="brokerLicenseNumber" value={form.brokerLicenseNumber} onChange={update} /><Field label="Agent name" name="agentName" value={form.agentName} onChange={update} /><Field label="Agent license number" name="agentLicenseNumber" value={form.agentLicenseNumber} onChange={update} /><label className="block text-xs font-bold text-slate-300">Compensation terms<textarea required maxLength={500} value={form.compensation} onChange={(event) => update('compensation', event.target.value)} className="mt-2 min-h-24 w-full border border-white/15 bg-black/20 px-3 py-2 text-sm text-white outline-none focus:border-cyan-300" /></label><label className="flex items-start gap-3 border border-white/10 p-3 text-sm text-slate-300"><input type="checkbox" checked={form.intermediaryConsent} onChange={(event) => update('intermediaryConsent', event.target.checked)} className="mt-1" /><span>Client gives advance written consent for the broker to act as an intermediary when Texas law permits. Separate transaction disclosures may still be required.</span></label></section>
  <footer className="lg:col-span-2 flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-5"><div>{message ? <p className={state === 'error' ? 'text-sm text-rose-200' : 'text-sm text-emerald-200'}>{message}</p> : <p className="flex items-center gap-2 text-xs text-slate-500"><Mail size={14} />Recipient receives a secure signer link.</p>}{signingUrl ? <a href={signingUrl} className="mt-2 inline-block text-xs font-bold text-cyan-200 underline">Open signer link</a> : null}</div><button type="submit" disabled={state === 'sending'} className="inline-flex items-center gap-2 bg-cyan-700 px-5 py-3 text-sm font-black text-white hover:bg-cyan-600 disabled:opacity-50"><Send size={16} />{state === 'sending' ? 'Sending...' : 'Create and send'}</button></footer></form></div></main>;
}

function Field({ label, name, value, onChange, type = 'text' }: { label: string; name: string; value: string; onChange: (name: string, value: string) => void; type?: string }) { return <label className="block text-xs font-bold text-slate-300">{label}<input required type={type} value={value} onChange={(event) => onChange(name, event.target.value)} className="mt-2 w-full border border-white/15 bg-black/20 px-3 py-2 text-sm text-white outline-none focus:border-cyan-300" /></label>; }
function Select({ label, name, value, options, onChange }: { label: string; name: string; value: string; options: string[][]; onChange: (name: string, value: string) => void }) { return <label className="block text-xs font-bold text-slate-300">{label}<select value={value} onChange={(event) => onChange(name, event.target.value)} className="mt-2 w-full border border-white/15 bg-[#0a1519] px-3 py-2 text-sm text-white outline-none focus:border-cyan-300">{options.map(([id, text]) => <option key={id} value={id}>{text}</option>)}</select></label>; }
