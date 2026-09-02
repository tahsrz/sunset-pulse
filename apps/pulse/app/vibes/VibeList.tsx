'use client';

import Link from 'next/link';
import React, { useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { parseVibeListQuery, serializeVibeListQuery, type VibeListQuery } from '@/lib/cms/vibeListQuery';
import { VibeListToolbar } from './_components/VibeListToolbar';
import { VibeStatusViews } from './_components/VibeStatusViews';
import { VibeRowActions } from './_components/VibeRowActions';
import { VibeStatusBadge } from './_components/VibeStatusBadge';
import { VibeNotice } from './_components/VibeNotice';
import { VibeConfirmDialog } from './_components/VibeConfirmDialog';
import { VibePageHeader } from './_components/VibePageHeader';
import { VibeListEmptyState } from './_components/VibeListEmptyState';

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
  statusCounts?: Record<string, number>;
};

const PAGE_SIZE = 25;
const STATUS_VIEWS = [
  { value: '', label: 'All' },
  { value: 'draft', label: 'Drafts' },
  { value: 'in_review', label: 'In review' },
  { value: 'published', label: 'Published' },
  { value: 'archived', label: 'Archived' },
  { value: 'trash', label: 'Trash' },
] as const;

function formatModified(value?: string) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? '—' : date.toLocaleDateString();
}

function sortLabel(active: boolean, direction: 'asc' | 'desc') {
  return active ? (direction === 'asc' ? '↑' : '↓') : '↕';
}

export function VibeList() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const parsedQuery = parseVibeListQuery(new URLSearchParams(searchParams.toString()));
  const [vibes, setVibes] = useState<Vibe[]>([]);
  const [search, setSearch] = useState(parsedQuery.q);
  const [debouncedSearch, setDebouncedSearch] = useState(parsedQuery.q);
  const [status, setStatus] = useState(parsedQuery.status);
  const [sort, setSort] = useState(parsedQuery.sort);
  const [direction, setDirection] = useState(parsedQuery.direction);
  const [page, setPage] = useState(parsedQuery.page);
  const [total, setTotal] = useState(0);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkAction, setBulkAction] = useState<'' | 'archive' | 'trash'>('');
  const [confirmAction, setConfirmAction] = useState<'archive' | 'trash' | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    setSearch(parsedQuery.q); setDebouncedSearch(parsedQuery.q); setStatus(parsedQuery.status); setSort(parsedQuery.sort);
    setDirection(parsedQuery.direction); setPage(parsedQuery.page);
  // URL is the source of truth when navigating with Back/Forward.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  function updateQuery(next: Partial<VibeListQuery>, mode: 'push' | 'replace' = 'push') {
    const current = parseVibeListQuery(new URLSearchParams(searchParams.toString()));
    const query = { ...current, ...next };
    const queryString = serializeVibeListQuery(query);
    router[mode](queryString ? `${pathname}?${queryString}` : pathname);
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search);
      if (search !== parsedQuery.q) updateQuery({ q: search, page: 1 }, 'replace');
    }, 275);
    return () => window.clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  useEffect(() => {
    const controller = new AbortController();
    const query = new URLSearchParams({ pageSize: String(PAGE_SIZE), page: String(page) });
    if (debouncedSearch.trim()) query.set('search', debouncedSearch.trim());
    if (status) query.set('status', status);
    query.set('sort', sort);
    query.set('direction', direction);

    setLoading(true);
    fetch(`/api/vibes?${query}`, { signal: controller.signal })
      .then(async (response): Promise<ListResponse> => {
        if (!response.ok) throw new Error('Unable to load vibes.');
        const body = await response.text();
        if (!body.trim()) return { vibes: [], total: 0, totalPages: 1, statusCounts: {} };
        try {
          return JSON.parse(body) as ListResponse;
        } catch {
          throw new Error('Unable to load vibes.');
        }
      })
      .then((payload) => {
        setVibes(payload.vibes || []);
        setTotal(payload.total || 0);
        setStatusCounts(payload.statusCounts || {});
        setTotalPages(Math.max(1, payload.totalPages || 1));
        setError('');
        setSelected(new Set());
      })
      .catch((reason: Error) => {
        if (reason.name !== 'AbortError') setError(reason.message);
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });

    return () => controller.abort();
  }, [page, debouncedSearch, status, sort, direction, refreshToken]);

  function changeSort(nextSort: 'title' | 'status' | 'updatedAt') {
    const nextDirection = sort === nextSort ? (direction === 'asc' ? 'desc' : 'asc') : (nextSort === 'title' ? 'asc' : 'desc');
    setSort(nextSort); setDirection(nextDirection); setPage(1);
    updateQuery({ sort: nextSort, direction: nextDirection, page: 1 });
  }

  async function runBulk(action: 'archive' | 'trash') {
    if (!selected.size) return;
    setBulkBusy(true); setError(''); setSuccessMessage('');
    try { const response = await fetch('/api/vibes/bulk', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ vibeIds: [...selected], action }) }); const payload = await response.json(); if (!response.ok) throw new Error(payload.error || 'Bulk action failed.'); setSuccessMessage(`${selected.size} Vibe${selected.size === 1 ? '' : 's'} ${action === 'trash' ? 'moved to trash' : 'archived'}.`); setSelected(new Set()); setBulkAction(''); setRefreshToken((current) => current + 1); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Bulk action failed.'); }
    finally { setBulkBusy(false); setConfirmAction(null); }
  }

  const rangeStart = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * PAGE_SIZE, total);

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-8 text-slate-900 sm:px-8">
      <div className="mx-auto max-w-7xl">
        <VibePageHeader eyebrow="Content management" title="All Vibes" description="Manage drafts, reviews, published revisions, and their editorial history." actions={<Link href="/vibes/new" className="rounded border border-[#2271b1] px-3 py-2 text-sm font-semibold text-[#2271b1] hover:bg-sky-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2271b1] focus-visible:ring-offset-2">Add New</Link>} />

        <div className="mb-3 px-1">
          <VibeStatusViews views={STATUS_VIEWS.map((view) => ({ ...view, count: view.value ? statusCounts[view.value] || 0 : Object.values(statusCounts).reduce((sum, count) => sum + count, 0) }))} activeValue={status} onChange={(value) => { const nextStatus = value as VibeListQuery['status']; setStatus(nextStatus); setPage(1); updateQuery({ status: nextStatus, page: 1 }); }} />
        </div>
        <section className="border border-slate-200 bg-white" aria-label="Vibe list">
          {successMessage ? <div className="p-4 pb-0"><VibeNotice tone="success" onDismiss={() => setSuccessMessage('')}>{successMessage}</VibeNotice></div> : null}
          <VibeListToolbar position="top" selectedCount={selected.size} action={bulkAction} onActionChange={setBulkAction} onApply={() => { if (bulkAction) setConfirmAction(bulkAction); }} busy={bulkBusy} search={search} onSearchChange={setSearch} />

          {!loading && !error ? <p className="border-b border-slate-100 px-4 py-3 text-sm text-slate-500">{total} {total === 1 ? 'item' : 'items'}</p> : null}
          {loading ? <p className="p-8 text-sm text-slate-500">Loading vibes…</p> : null}
          {!loading && error ? <p role="alert" className="p-8 text-sm text-red-700">{error}</p> : null}
          {!loading && !error && vibes.length === 0 ? <VibeListEmptyState search={search} status={status} onClearSearch={() => { setSearch(''); updateQuery({ q: '', page: 1 }, 'replace'); }} onClearStatus={() => { setStatus(''); updateQuery({ status: '', page: 1 }); }} /> : null}

          {!loading && !error && vibes.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th scope="col" className="px-4 py-3"><input aria-label="Select all Vibes on this page" type="checkbox" checked={vibes.length > 0 && vibes.every((vibe) => selected.has(vibe.vibeId))} onChange={(event) => setSelected(event.target.checked ? new Set(vibes.map((vibe) => vibe.vibeId)) : new Set())} /></th>
                      <th scope="col" aria-sort={sort === 'title' ? (direction === 'asc' ? 'ascending' : 'descending') : 'none'} className="px-4 py-3"><button type="button" onClick={() => changeSort('title')} className="font-bold hover:text-slate-900">Vibe <span aria-hidden="true">{sortLabel(sort === 'title', direction)}</span></button></th>
                      <th scope="col" aria-sort={sort === 'status' ? (direction === 'asc' ? 'ascending' : 'descending') : 'none'} className="px-4 py-3"><button type="button" onClick={() => changeSort('status')} className="font-bold hover:text-slate-900">Status <span aria-hidden="true">{sortLabel(sort === 'status', direction)}</span></button></th>
                      <th scope="col" className="px-4 py-3">Revision</th>
                      <th scope="col" aria-sort={sort === 'updatedAt' ? (direction === 'asc' ? 'ascending' : 'descending') : 'none'} className="px-4 py-3"><button type="button" onClick={() => changeSort('updatedAt')} className="font-bold hover:text-slate-900">Last modified <span aria-hidden="true">{sortLabel(sort === 'updatedAt', direction)}</span></button></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {vibes.map((vibe) => (
                      <tr key={vibe.vibeId} className="hover:bg-slate-50">
                        <td className="px-4 py-3"><input aria-label={`Select ${vibe.title || vibe.name || vibe.vibeId}`} type="checkbox" checked={selected.has(vibe.vibeId)} onChange={(event) => setSelected((current) => { const next = new Set(current); if (event.target.checked) next.add(vibe.vibeId); else next.delete(vibe.vibeId); return next; })} /></td>
                        <td className="px-4 py-3">
                          <Link className="font-bold text-slate-900 hover:underline" href={`/vibes/${vibe.vibeId}/edit`}>{vibe.title || vibe.name || vibe.vibeId}</Link>
                          <div className="font-mono text-xs text-slate-500">/{vibe.slug || vibe.vibeId}</div>
                          <div className="mt-2"><VibeRowActions actions={[{ label: 'Edit', href: `/vibes/${vibe.vibeId}/edit` }, { label: 'Preview', href: `/vibes/${vibe.vibeId}/preview` }, { label: 'Revisions', href: `/vibes/${vibe.vibeId}/revisions` }, { label: 'Status & Actions', href: `/vibes/${vibe.vibeId}/actions` }]} /></div>
                        </td>
                        <td className="px-4 py-3"><VibeStatusBadge status={vibe.status || 'draft'} /></td>
                        <td className="px-4 py-3 text-xs text-slate-500">{vibe.publishedRevisionId ? 'Published revision' : '—'}</td>
                        <td className="px-4 py-3 text-xs text-slate-500">{formatModified(vibe.updatedAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <VibeListToolbar position="bottom" selectedCount={selected.size} action={bulkAction} onActionChange={setBulkAction} onApply={() => { if (bulkAction) setConfirmAction(bulkAction); }} busy={bulkBusy} />
              {totalPages > 1 ? (
                <nav className="flex items-center justify-between gap-3 border-t border-slate-200 p-4" aria-label="Vibe pagination">
                  <p className="text-sm text-slate-500">Showing {rangeStart}–{rangeEnd} of {total}</p>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => { const nextPage = Math.max(1, page - 1); setPage(nextPage); updateQuery({ page: nextPage }); }} disabled={page === 1} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold disabled:opacity-50">Previous</button>
                    <button type="button" onClick={() => { const nextPage = Math.min(totalPages, page + 1); setPage(nextPage); updateQuery({ page: nextPage }); }} disabled={page === totalPages} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold disabled:opacity-50">Next</button>
                  </div>
                </nav>
              ) : null}
          </>
          ) : null}
        </section>
      </div>
      <VibeConfirmDialog open={confirmAction !== null} title={`${confirmAction === 'trash' ? 'Move' : 'Archive'} selected Vibes?`} description={`This will ${confirmAction === 'trash' ? 'move' : 'archive'} ${selected.size} selected Vibe${selected.size === 1 ? '' : 's'}.`} confirmLabel={confirmAction === 'trash' ? 'Move to trash' : 'Archive'} cancelLabel="Cancel" busy={bulkBusy} onOpenChange={(open) => { if (!open) setConfirmAction(null); }} onConfirm={() => { if (confirmAction) void runBulk(confirmAction); }} />
    </div>
  );
}
