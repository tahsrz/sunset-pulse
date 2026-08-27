'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

type Vibe = { vibeId: string; title?: string; name?: string; slug?: string; status?: string; updatedAt?: string; publishedRevisionId?: string };

export function VibeList() {
  const [vibes, setVibes] = useState<Vibe[]>([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    const query = new URLSearchParams({ pageSize: '50' });
    if (search.trim()) query.set('search', search.trim());
    if (status) query.set('status', status);
    fetch(`/api/vibes?${query}`, { signal: controller.signal })
      .then(async (response) => { if (!response.ok) throw new Error('Unable to load vibes.'); return response.json(); })
      .then((payload) => { setVibes(payload.vibes || []); setError(''); })
      .catch((reason) => { if (reason.name !== 'AbortError') setError(reason.message); })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [search, status]);

  return <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-900 sm:px-8"><div className="mx-auto max-w-7xl"><header className="mb-6 flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Content management</p><h1 className="mt-1 text-3xl font-black tracking-tight">Vibes</h1><p className="mt-1 text-sm text-slate-600">Manage draft, review, and published vibe systems.</p></div><Link href="/vibes/new" className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-bold text-white">Add New Vibe</Link></header><section className="rounded-xl border border-slate-200 bg-white shadow-sm"><div className="flex flex-wrap gap-3 border-b border-slate-200 p-4"><input aria-label="Search vibes" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search title or slug" className="min-w-64 flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm" /><select aria-label="Filter by status" value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-md border border-slate-300 py-2 pl-3 pr-10 text-sm"><option value="">All statuses</option><option value="draft">Draft</option><option value="in_review">In review</option><option value="published">Published</option><option value="archived">Archived</option><option value="trash">Trash</option></select></div>{loading ? <p className="p-8 text-sm text-slate-500">Loading vibes…</p> : error ? <p role="alert" className="p-8 text-sm text-red-700">{error}</p> : vibes.length === 0 ? <p className="p-8 text-sm text-slate-500">No vibes found.</p> : <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Vibe</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Revision</th><th className="px-4 py-3">Last modified</th><th className="px-4 py-3" /></tr></thead><tbody className="divide-y divide-slate-100">{vibes.map((vibe) => <tr key={vibe.vibeId}><td className="px-4 py-3"><Link className="font-bold text-slate-900 hover:underline" href={`/vibes/${vibe.vibeId}/edit`}>{vibe.title || vibe.name || vibe.vibeId}</Link><div className="text-xs text-slate-500">{vibe.slug || vibe.vibeId}</div></td><td className="px-4 py-3"><span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold">{vibe.status || 'draft'}</span></td><td className="px-4 py-3 text-xs text-slate-500">{vibe.publishedRevisionId ? 'Published' : '—'}</td><td className="px-4 py-3 text-xs text-slate-500">{vibe.updatedAt ? new Date(vibe.updatedAt).toLocaleDateString() : '—'}</td><td className="px-4 py-3 text-right"><Link href={`/vibes/${vibe.vibeId}/edit`} className="text-xs font-bold text-slate-700 hover:underline">Edit</Link></td></tr>)}</tbody></table></div>}</section></div></main>;
}
