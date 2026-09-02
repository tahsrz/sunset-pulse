'use client';
import { useEffect, useState } from 'react';

type Change = { path: string; from?: unknown; to?: unknown };
export function CompareView({ vibeId, from, to }: { vibeId: string; from: string; to: string }) {
  const [changes, setChanges] = useState<Change[] | null>(null);
  const [error, setError] = useState('');
  useEffect(() => { if (!from || !to) { setError('Select two revisions to compare.'); return; } fetch(`/api/vibes/${encodeURIComponent(vibeId)}/compare?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`).then(async (response) => { if (!response.ok) throw new Error('Unable to compare revisions.'); return response.json(); }).then((payload) => setChanges(payload.changes || [])).catch((reason) => setError(reason.message)); }, [vibeId, from, to]);
  if (error) return <p role="alert" className="mt-6 rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{error}</p>;
  if (!changes) return <p className="mt-6 rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-500">Loading comparison…</p>;
  return <section className="mt-6 border border-slate-200 bg-white p-5"><p className="text-sm text-slate-500">{changes.length} changed field{changes.length === 1 ? '' : 's'}</p>{changes.length === 0 ? <p className="mt-4 text-sm text-emerald-700">No differences found.</p> : <div className="mt-4 divide-y divide-slate-100">{changes.map((change) => <div key={change.path} className="grid gap-3 py-4 sm:grid-cols-[180px_1fr_1fr]"><code className="text-xs font-bold text-slate-700">{change.path}</code><pre className="overflow-auto rounded bg-red-50 p-2 text-xs text-red-800">{JSON.stringify(change.from, null, 2)}</pre><pre className="overflow-auto rounded bg-emerald-50 p-2 text-xs text-emerald-800">{JSON.stringify(change.to, null, 2)}</pre></div>)}</div>}</section>;
}
