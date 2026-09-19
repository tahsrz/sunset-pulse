'use client';

import { useEffect, useState } from 'react';

type Entry = { id: string; address: string | null; city: string | null; propertyKind: string };

export function PropertyContextCapture({ commandId, command, title, body }: { commandId: string; command: string; title: string; body: string }) {
  const isPropertyContext = /property|listing|home|house|Keller|Westlake|Granada|Fair Oaks|Bursey|Old Town/i.test(`${command} ${title} ${body}`);
  const [entries, setEntries] = useState<Entry[]>([]), [propertyId, setPropertyId] = useState(''), [saved, setSaved] = useState(false), [error, setError] = useState('');
  useEffect(() => { if (!isPropertyContext) return; void fetch('/api/property-shortlist', { cache: 'no-store' }).then(async (response) => { const payload = await response.json(); if (!response.ok) throw new Error(payload.error || 'Unable to load shortlist.'); setEntries(payload.entries || []); }).catch((reason) => setError(reason instanceof Error ? reason.message : 'Unable to load shortlist.')); }, [isPropertyContext]);
  if (!isPropertyContext) return null;
  const save = async () => { if (!propertyId) return; setError(''); const response = await fetch('/api/property-shortlist', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'add_note', propertyId, body: `${title}\n\n${body}`.slice(0, 4000), sourceCommandId: commandId }) }); const payload = await response.json(); if (!response.ok) { setError(payload.error || 'Unable to save Jamie context.'); return; } setSaved(true); };
  return <section className="rounded-lg border border-cyan-200/20 bg-cyan-200/5 p-4"><p className="text-xs font-black uppercase tracking-[0.14em] text-cyan-100">Organize with Jamie</p><p className="mt-1 text-sm text-slate-300">Save this property-related result as context for a shortlist entry. It stays a note until you review it.</p><div className="mt-3 flex flex-col gap-2 sm:flex-row"><select aria-label="Property for Jamie context" value={propertyId} onChange={(event) => setPropertyId(event.target.value)} className="min-h-10 flex-1 border border-white/10 bg-slate-950 px-3 text-sm text-white"><option value="">Choose a Keller / Westlake property</option>{entries.map((entry) => <option key={entry.id} value={entry.id}>{entry.address || 'Unresolved property'} · {entry.city || 'City unknown'}</option>)}</select><button type="button" disabled={!propertyId || saved} onClick={() => void save()} className="min-h-10 border border-cyan-200/30 px-3 text-xs font-black uppercase text-cyan-100 disabled:opacity-50">{saved ? 'Saved to context' : 'Save result'}</button></div>{error && <p className="mt-2 text-sm text-amber-200">{error}</p>}</section>;
}
