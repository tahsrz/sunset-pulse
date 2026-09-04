'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import React, { useEffect, useState } from 'react';
import { VibePageHeader } from '../_components/VibePageHeader';
import { VibeStatusBadge } from '../_components/VibeStatusBadge';

type CmsPageSummary = {
  pageId: string;
  title: string;
  slug: string;
  routePath?: string;
  status: string;
  currentDraftVersion?: number;
  publishedRevisionId?: string;
  updatedAt?: string;
};

const STATUS_FILTERS = [['', 'All'], ['draft', 'Drafts'], ['published', 'Published'], ['trash', 'Trash']] as const;

export function PageDirectory() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const siteId = searchParams.get('siteId')?.trim() || '';
  const status = searchParams.get('status')?.trim() || '';
  const appliedSearch = searchParams.get('search')?.trim() || '';
  const createdPageId = searchParams.get('created')?.trim() || '';
  const [siteInput, setSiteInput] = useState(siteId);
  const [search, setSearch] = useState(appliedSearch);
  const [pages, setPages] = useState<CmsPageSummary[]>([]);
  const [loading, setLoading] = useState(Boolean(siteId));
  const [error, setError] = useState('');

  useEffect(() => setSiteInput(siteId), [siteId]);
  useEffect(() => setSearch(appliedSearch), [appliedSearch]);
  useEffect(() => {
    if (!siteId) { setPages([]); setLoading(false); return; }
    const controller = new AbortController();
    const query = new URLSearchParams({ siteId, pageSize: '100' });
    if (status) query.set('status', status);
    if (appliedSearch) query.set('search', appliedSearch);
    setLoading(true);
    fetch(`/api/vibes/pages?${query}`, { signal: controller.signal })
      .then(async (response) => {
        const payload = await readJson(response);
        if (!response.ok) throw new Error(payload?.error || 'Unable to load pages.');
        return payload as { pages?: CmsPageSummary[] };
      })
      .then((payload) => { setPages(payload?.pages || []); setError(''); })
      .catch((reason: Error) => { if (reason.name !== 'AbortError') setError(reason.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [siteId, status, appliedSearch]);

  function navigate(next: { siteId?: string; status?: string; search?: string }) {
    const query = new URLSearchParams(searchParams.toString());
    Object.entries(next).forEach(([key, value]) => value ? query.set(key, value) : query.delete(key));
    router.push(`/vibes/pages${query.size ? `?${query}` : ''}`);
  }

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-8 text-slate-900 sm:px-8">
      <div className="mx-auto max-w-7xl">
        <VibePageHeader eyebrow="Content" title="Pages" description="Create and publish structured pages for one site." actions={siteId ? <Link href={`/vibes/pages/new?siteId=${encodeURIComponent(siteId)}`} className="rounded border border-[#2271b1] px-3 py-2 text-sm font-semibold text-[#2271b1] hover:bg-sky-50">Add New Page</Link> : undefined} />

        {createdPageId ? <p role="status" className="mb-4 border-l-4 border-emerald-600 bg-white p-3 text-sm">Page created. It is ready for content editing.</p> : null}

        <form className="mb-5 flex flex-col gap-2 border border-slate-200 bg-white p-4 sm:flex-row sm:items-end" onSubmit={(event) => { event.preventDefault(); navigate({ siteId: siteInput.trim(), status: '', search: '' }); }}>
          <label className="flex-1 text-sm font-semibold">Site ID<input required value={siteInput} onChange={(event) => setSiteInput(event.target.value)} placeholder="Enter the Launch Kit site ID" className="mt-1 w-full rounded border border-slate-300 px-3 py-2 font-normal" /></label>
          <button className="rounded bg-[#2271b1] px-4 py-2 text-sm font-semibold text-white hover:bg-[#135e96]">Open site pages</button>
        </form>

        {siteId ? <>
          <nav aria-label="Page status filters" className="mb-3 flex flex-wrap gap-2 text-sm">
            {STATUS_FILTERS.map(([value, label]) => <button key={label} type="button" onClick={() => navigate({ status: value })} className={status === value ? 'font-semibold text-slate-900' : 'text-[#2271b1] hover:underline'}>{label}</button>)}
          </nav>
          <section className="border border-slate-200 bg-white" aria-label="Page list">
            <form className="flex justify-end gap-2 border-b border-slate-200 p-3" onSubmit={(event) => { event.preventDefault(); navigate({ search }); }}>
              <label className="sr-only" htmlFor="page-search">Search pages</label>
              <input id="page-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search pages" className="w-full max-w-xs rounded border border-slate-300 px-3 py-2 text-sm" />
              <button className="rounded border border-[#2271b1] px-3 py-2 text-sm font-semibold text-[#2271b1]">Search</button>
            </form>
            {loading ? <p className="p-8 text-sm text-slate-500">Loading pages…</p> : null}
            {!loading && error ? <p role="alert" className="p-8 text-sm text-red-700">{error}</p> : null}
            {!loading && !error && pages.length === 0 ? <div className="p-8"><h2 className="font-semibold">No pages found.</h2><p className="mt-1 text-sm text-slate-500">Create the first page for this site or change the filters.</p></div> : null}
            {!loading && !error && pages.length > 0 ? <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th scope="col" className="px-4 py-3">Title</th><th scope="col" className="px-4 py-3">Status</th><th scope="col" className="px-4 py-3">Version</th><th scope="col" className="px-4 py-3">Last modified</th></tr></thead><tbody className="divide-y divide-slate-100">{pages.map((page) => <tr key={page.pageId} className="hover:bg-slate-50"><td className="px-4 py-3"><Link href={`/vibes/pages/${encodeURIComponent(page.pageId)}/edit?siteId=${encodeURIComponent(siteId)}`} className="font-semibold text-[#2271b1] hover:underline">{page.title}</Link><div className="font-mono text-xs text-slate-500">/{page.routePath || page.slug}</div></td><td className="px-4 py-3"><VibeStatusBadge status={page.status} /></td><td className="px-4 py-3 text-slate-500">Draft {page.currentDraftVersion || 0}{page.publishedRevisionId ? ' · Published' : ''}</td><td className="px-4 py-3 text-slate-500">{formatDate(page.updatedAt)}</td></tr>)}</tbody></table></div> : null}
          </section>
        </> : <p className="border-l-4 border-[#2271b1] bg-white p-4 text-sm">Enter a site ID to manage its pages. Pages are isolated by site.</p>}
      </div>
    </div>
  );
}

async function readJson(response: Response) {
  const text = await response.text();
  if (!text.trim()) return null;
  try { return JSON.parse(text); } catch { return null; }
}

function formatDate(value?: string) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? '—' : date.toLocaleDateString();
}
