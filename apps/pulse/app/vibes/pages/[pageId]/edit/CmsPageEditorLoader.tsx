'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import React, { useEffect, useState } from 'react';
import { VibePageHeader } from '../../../_components/VibePageHeader';
import { VibeStatusBadge } from '../../../_components/VibeStatusBadge';
import type { CmsPageDraft } from '@/lib/cms/pages/pageSchema';

type CmsPagePreview = {
  pageId: string;
  siteId: string;
  routePath?: string;
  status: 'draft' | 'published';
  currentDraftVersion: number;
  publishedRevisionId?: string;
  draftPayload: CmsPageDraft;
};

type LoadState =
  | { kind: 'loading' }
  | { kind: 'ready'; page: CmsPagePreview }
  | { kind: 'not-found'; message: string }
  | { kind: 'conflict'; message: string }
  | { kind: 'malformed'; message: string }
  | { kind: 'error'; message: string };

export function CmsPageEditorLoader({ pageId }: { pageId: string }) {
  const searchParams = useSearchParams();
  const siteId = searchParams.get('siteId')?.trim() || '';
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<LoadState>({ kind: 'loading' });

  useEffect(() => {
    if (!siteId) return;
    const controller = new AbortController();
    setState({ kind: 'loading' });
    fetch(`/api/vibes/pages/${encodeURIComponent(pageId)}?siteId=${encodeURIComponent(siteId)}`, { signal: controller.signal })
      .then(async (response) => {
        const payload = await readJson(response);
        if (response.status === 404) return { kind: 'not-found', message: errorMessage(payload, 'Page not found.') } as LoadState;
        if (response.status === 409) return { kind: 'conflict', message: errorMessage(payload, 'Page changed while it was loading.') } as LoadState;
        if (!response.ok) return { kind: 'error', message: errorMessage(payload, `Unable to load page (${response.status}).`) } as LoadState;
        const page = parsePage(payload?.page);
        return page
          ? { kind: 'ready', page } as LoadState
          : { kind: 'malformed', message: 'The page response is incomplete. Reload before editing.' } as LoadState;
      })
      .then((nextState) => setState(nextState))
      .catch((reason: Error) => {
        if (reason.name !== 'AbortError') setState({ kind: 'error', message: reason.message || 'Unable to load page.' });
      });
    return () => controller.abort();
  }, [attempt, pageId, siteId]);

  const pagesHref = siteId ? `/vibes/pages?siteId=${encodeURIComponent(siteId)}` : '/vibes/pages';
  if (!siteId) return <EditorMessage title="Choose a site first" message="This editor requires the site ID that owns the page." pagesHref={pagesHref} />;
  if (state.kind === 'loading') return <EditorMessage title="Loading page" message="Retrieving the current draft and version…" pagesHref={pagesHref} busy />;
  if (state.kind !== 'ready') return <EditorMessage title={state.kind === 'not-found' ? 'Page not found' : state.kind === 'conflict' ? 'Page changed' : state.kind === 'malformed' ? 'Page could not be opened' : 'Page failed to load'} message={state.message} pagesHref={pagesHref} onRetry={() => setAttempt((value) => value + 1)} />;

  const { page } = state;
  return <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-900 sm:px-8"><div className="mx-auto max-w-7xl">
    <VibePageHeader eyebrow="Pages" title={page.draftPayload.title} description={`/${page.routePath || page.draftPayload.slug}`} backHref={pagesHref} backLabel="All Pages" />
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
      <section aria-label="Page content" className="min-h-[420px] border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold">Page content</h2>
        <p className="mt-2 text-sm text-slate-500">{page.draftPayload.blocks.length === 0 ? 'This page has no blocks yet.' : `${page.draftPayload.blocks.length} content block${page.draftPayload.blocks.length === 1 ? '' : 's'} loaded.`}</p>
        <div className="mt-8 border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">The block canvas and inserter are the next E3 slice.</div>
      </section>
      <aside aria-label="Document summary" className="h-fit border border-slate-200 bg-white p-5">
        <h2 className="font-semibold">Document</h2>
        <dl className="mt-4 space-y-4 text-sm"><div><dt className="text-slate-500">Status</dt><dd className="mt-1"><VibeStatusBadge status={page.status} /></dd></div><div><dt className="text-slate-500">Draft version</dt><dd className="mt-1 font-semibold">{page.currentDraftVersion}</dd></div><div><dt className="text-slate-500">Template</dt><dd className="mt-1 font-mono text-xs">{page.draftPayload.templateId}</dd></div><div><dt className="text-slate-500">Site ID</dt><dd className="mt-1 break-all font-mono text-xs">{page.siteId}</dd></div></dl>
      </aside>
    </div>
  </div></main>;
}

function EditorMessage({ title, message, pagesHref, onRetry, busy = false }: { title: string; message: string; pagesHref: string; onRetry?: () => void; busy?: boolean }) {
  return <main className="min-h-screen bg-slate-100 px-4 py-12 text-slate-900"><div className="mx-auto max-w-2xl border border-slate-200 bg-white p-6" aria-busy={busy || undefined}><h1 className="text-2xl font-semibold">{title}</h1><p className="mt-2 text-sm text-slate-600">{message}</p><div className="mt-5 flex gap-3">{onRetry ? <button type="button" onClick={onRetry} className="rounded bg-[#2271b1] px-4 py-2 text-sm font-semibold text-white">Retry</button> : null}<Link href={pagesHref} className="rounded border border-slate-300 px-4 py-2 text-sm font-semibold">Back to Pages</Link></div></div></main>;
}

type JsonPayload = { error?: unknown; page?: unknown };

async function readJson(response: Response): Promise<JsonPayload | null> {
  const text = await response.text();
  if (!text.trim()) return null;
  try {
    const value: unknown = JSON.parse(text);
    return value && typeof value === 'object' ? value as JsonPayload : null;
  } catch { return null; }
}

function errorMessage(payload: JsonPayload | null, fallback: string) {
  return typeof payload?.error === 'string' && payload.error.trim() ? payload.error : fallback;
}

function parsePage(value: unknown): CmsPagePreview | null {
  if (!value || typeof value !== 'object') return null;
  const page = value as Record<string, unknown>;
  const draft = page.draftPayload as Record<string, unknown> | undefined;
  if (typeof page.pageId !== 'string' || typeof page.siteId !== 'string' || (page.status !== 'draft' && page.status !== 'published') || typeof page.currentDraftVersion !== 'number' || !draft || typeof draft.title !== 'string' || typeof draft.slug !== 'string' || typeof draft.templateId !== 'string' || !Array.isArray(draft.blocks)) return null;
  return value as CmsPagePreview;
}
