'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

type Vibe = {
  vibeId: string;
  title?: string;
  name?: string;
  slug?: string;
  status?: string;
  updatedAt?: string;
  publishedRevisionId?: string;
};

type ListResponse = {
  vibes?: Vibe[];
  total?: number;
  totalPages?: number;
};

const PAGE_SIZE = 25;

function statusLabel(status?: string) {
  return (status || 'draft').replace(/_/g, ' ');
}

function formatModified(value?: string) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? '—' : date.toLocaleDateString();
}

export function VibeList() {
  const [vibes, setVibes] = useState<Vibe[]>([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setPage(1);
  }, [search, status]);

  useEffect(() => {
    const controller = new AbortController();
    const query = new URLSearchParams({ pageSize: String(PAGE_SIZE), page: String(page) });
    if (search.trim()) query.set('search', search.trim());
    if (status) query.set('status', status);

    setLoading(true);
    fetch(`/api/vibes?${query}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error('Unable to load vibes.');
        return response.json() as Promise<ListResponse>;
      })
      .then((payload) => {
        setVibes(payload.vibes || []);
        setTotal(payload.total || 0);
        setTotalPages(Math.max(1, payload.totalPages || 1));
        setError('');
      })
      .catch((reason: Error) => {
        if (reason.name !== 'AbortError') setError(reason.message);
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [page, search, status]);

  const rangeStart = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * PAGE_SIZE, total);

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-900 sm:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Content management</p>
            <h1 className="mt-1 text-3xl font-black tracking-tight">All Vibes</h1>
            <p className="mt-1 text-sm text-slate-600">Manage drafts, reviews, published revisions, and their editorial history.</p>
          </div>
          <Link href="/vibes/new" className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-bold text-white">Add New Vibe</Link>
        </header>

        <section className="rounded-xl border border-slate-200 bg-white shadow-sm" aria-label="Vibe list">
          <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 p-4">
            <input
              aria-label="Search vibes"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search title or slug"
              className="min-w-64 flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
            <select
              aria-label="Filter by status"
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className="rounded-md border border-slate-300 py-2 pl-3 pr-10 text-sm"
            >
              <option value="">All statuses</option>
              <option value="draft">Drafts</option>
              <option value="in_review">In review</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
              <option value="trash">Trash</option>
            </select>
          </div>

          {!loading && !error ? <p className="border-b border-slate-100 px-4 py-3 text-sm text-slate-500">{total} {total === 1 ? 'item' : 'items'}</p> : null}
          {loading ? <p className="p-8 text-sm text-slate-500">Loading vibes…</p> : null}
          {!loading && error ? <p role="alert" className="p-8 text-sm text-red-700">{error}</p> : null}
          {!loading && !error && vibes.length === 0 ? <p className="p-8 text-sm text-slate-500">No vibes found. Try another filter or <Link href="/vibes/new" className="font-semibold text-[#2271b1] hover:underline">add a new Vibe</Link>.</p> : null}

          {!loading && !error && vibes.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th scope="col" className="px-4 py-3">Vibe</th>
                      <th scope="col" className="px-4 py-3">Status</th>
                      <th scope="col" className="px-4 py-3">Revision</th>
                      <th scope="col" className="px-4 py-3">Last modified</th>
                      <th scope="col" className="px-4 py-3"><span className="sr-only">Actions</span></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {vibes.map((vibe) => (
                      <tr key={vibe.vibeId} className="hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <Link className="font-bold text-slate-900 hover:underline" href={`/vibes/${vibe.vibeId}/edit`}>{vibe.title || vibe.name || vibe.vibeId}</Link>
                          <div className="font-mono text-xs text-slate-500">/{vibe.slug || vibe.vibeId}</div>
                        </td>
                        <td className="px-4 py-3"><span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold capitalize">{statusLabel(vibe.status)}</span></td>
                        <td className="px-4 py-3 text-xs text-slate-500">{vibe.publishedRevisionId ? 'Published revision' : '—'}</td>
                        <td className="px-4 py-3 text-xs text-slate-500">{formatModified(vibe.updatedAt)}</td>
                        <td className="px-4 py-3 text-right text-xs font-bold">
                          <div className="flex justify-end gap-3">
                            <Link href={`/vibes/${vibe.vibeId}/edit`} className="text-slate-700 hover:underline">Edit</Link>
                            <Link href={`/vibes/${vibe.vibeId}/preview`} className="text-[#2271b1] hover:underline">Preview</Link>
                            <Link href={`/vibes/${vibe.vibeId}/actions`} className="text-[#2271b1] hover:underline">Actions</Link>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {totalPages > 1 ? (
                <nav className="flex items-center justify-between gap-3 border-t border-slate-200 p-4" aria-label="Vibe pagination">
                  <p className="text-sm text-slate-500">Showing {rangeStart}–{rangeEnd} of {total}</p>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page === 1} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold disabled:opacity-50">Previous</button>
                    <button type="button" onClick={() => setPage((current) => Math.min(totalPages, current + 1))} disabled={page === totalPages} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold disabled:opacity-50">Next</button>
                  </div>
                </nav>
              ) : null}
            </>
          ) : null}
        </section>
      </div>
    </main>
  );
}
