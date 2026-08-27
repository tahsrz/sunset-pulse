'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState, type FormEvent } from 'react';

export default function ApplyVibePage() {
  const { vibeId } = useParams<{ vibeId: string }>();
  const [siteId, setSiteId] = useState('');
  const [revisionId, setRevisionId] = useState('');
  const [result, setResult] = useState('');
  const [error, setError] = useState('');
  const [applying, setApplying] = useState(false);
  async function apply(event: FormEvent) {
    event.preventDefault(); setApplying(true); setError(''); setResult('');
    try {
      const response = await fetch(`/api/admin/sites/${encodeURIComponent(siteId)}/apply-vibe?tenantId=default`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ revisionId }) });
      const payload = await response.json();
      if (!response.ok) setError(payload.error || 'Unable to apply revision.');
      else setResult(`Revision ${revisionId} applied to site ${siteId}.`);
    } catch { setError('Unable to reach the site application endpoint.'); }
    finally { setApplying(false); }
  }
  return <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-900 sm:px-8"><div className="mx-auto max-w-2xl"><Link href={`/admin/vibes/${vibeId}/edit`} className="text-sm font-semibold text-slate-500 hover:underline">← Back to editor</Link><h1 className="mt-4 text-3xl font-black">Apply published revision</h1><p className="mt-1 text-sm text-slate-600">Attach a published revision to a controlled Launch Kit site.</p><form onSubmit={apply} className="mt-6 space-y-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"><label className="block text-sm font-bold">Site ID<input required value={siteId} onChange={(event) => setSiteId(event.target.value)} placeholder="agent-site-id" className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 font-normal" /></label><label className="block text-sm font-bold">Published revision ID<input required value={revisionId} onChange={(event) => setRevisionId(event.target.value)} placeholder="revision id from history" className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 font-mono font-normal" /></label><p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Only apply a revision after confirming it is published and belongs to this Vibe.</p>{error && <p role="alert" className="text-sm text-red-700">{error}</p>}{result && <p role="status" className="text-sm text-emerald-700">{result}</p>}<button disabled={applying} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{applying ? 'Applying…' : 'Apply revision'}</button></form></div></main>;
}
