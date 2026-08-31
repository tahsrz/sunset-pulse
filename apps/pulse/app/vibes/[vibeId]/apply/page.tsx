'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';

type Pointer = { revision?: { revisionId?: string; revisionNumber?: number } | null; appliedAt?: string | null; appliedBy?: string | null };

export default function ApplyVibePage() {
  const { vibeId } = useParams<{ vibeId: string }>();
  const [siteId, setSiteId] = useState('');
  const [revisionId, setRevisionId] = useState('');
  const [linkedRevisionId, setLinkedRevisionId] = useState('');
  const [revisionNumber, setRevisionNumber] = useState('');
  const [pointer, setPointer] = useState<Pointer | null>(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const linkedParams = new URLSearchParams(window.location.search);
    const revisionIdFromLink = linkedParams.get('revisionId');
    const linkedRevisionNumber = linkedParams.get('revisionNumber');
    if (revisionIdFromLink) {
      setRevisionId(revisionIdFromLink);
      setLinkedRevisionId(revisionIdFromLink);
    }
    if (linkedRevisionNumber) setRevisionNumber(linkedRevisionNumber);
  }, []);

  async function checkPointer() {
    setMessage('');
    try {
      const response = await fetch(`/api/admin/sites/${encodeURIComponent(siteId)}/vibe?tenantId=default`);
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Unable to read current site pointer.');
      setPointer(payload);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to read current site pointer.'); }
  }

  async function apply(event: FormEvent) {
    event.preventDefault(); setBusy(true); setMessage('');
    try {
      const response = await fetch(`/api/admin/sites/${encodeURIComponent(siteId)}/apply-vibe?tenantId=default`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ vibeId, revisionId }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Unable to apply revision.');
      setMessage(`Revision ${revisionId} applied to site ${siteId}.`); await checkPointer();
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to apply revision.'); }
    finally { setBusy(false); }
  }

  return <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-900 sm:px-8"><div className="mx-auto max-w-2xl"><Link href={`/vibes/${vibeId}/revisions`} className="text-sm font-semibold text-slate-500 hover:underline">← Back to revisions</Link><h1 className="mt-4 text-3xl font-black">Apply published revision</h1><p className="mt-1 text-sm text-slate-600">Vibe <span className="font-mono">{vibeId}</span> · confirm the exact published revision before applying.</p><form onSubmit={apply} className="mt-6 space-y-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"><label className="block text-sm font-bold">Site ID<input required value={siteId} onChange={event => setSiteId(event.target.value)} className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 font-normal" /></label><button type="button" onClick={() => void checkPointer()} disabled={!siteId || busy} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold">Check current site pointer</button>{pointer && <p className="rounded-lg bg-slate-50 p-3 text-xs">Current pointer: <span className="font-mono">{pointer.revision?.revisionId || 'none'}</span>{pointer.revision?.revisionNumber ? ` (revision ${pointer.revision.revisionNumber})` : ''}; applied {pointer.appliedAt ? new Date(pointer.appliedAt).toLocaleString() : 'never'} by {pointer.appliedBy || 'unknown'}.</p>}<label className="block text-sm font-bold">Published revision ID<input required value={revisionId} onChange={event => { const value = event.target.value; setRevisionId(value); if (value !== linkedRevisionId) setRevisionNumber(''); }} className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 font-mono font-normal" /></label>{revisionNumber ? <p className="rounded-lg bg-sky-50 p-3 text-sm text-sky-950">Selected from revision history: <strong>r{revisionNumber}</strong> · <span className="font-mono text-xs">{revisionId}</span></p> : null}<p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Only apply a published revision belonging to this Vibe. The protected site API verifies this again before it changes a live pointer.</p>{message && <p role="status" className="text-sm text-slate-700">{message}</p>}<button disabled={busy} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{busy ? 'Applying…' : 'Apply revision'}</button></form></div></main>;
}
