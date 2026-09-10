'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { z } from 'zod';

const pageResultSchema = z.object({
  pages: z.array(z.object({ pageId: z.string(), title: z.string(), routePath: z.string().optional(), slug: z.string() })),
  totalPages: z.number(),
});

export function ThemePreview({ scope, themeId }: { scope: string; themeId: string }) {
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<z.infer<typeof pageResultSchema> | null>(null);
  const [pageId, setPageId] = useState('');
  const [error, setError] = useState('');
  const [width, setWidth] = useState('100%');
  const [retry, setRetry] = useState(0);
  const [loadedUrl, setLoadedUrl] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    setResult(null); setError(''); setPageId('');
    fetch('/api/vibes/pages?' + scope + '&status=published&page=' + page + '&pageSize=25', { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error('Published pages could not be loaded.');
        const body = pageResultSchema.parse(await response.json());
        if (controller.signal.aborted) return;
        setResult(body); setPageId(body.pages[0]?.pageId || '');
      }).catch((error: unknown) => { if (!controller.signal.aborted) setError(error instanceof Error ? error.message : 'Pages could not be loaded.'); });
    return () => controller.abort();
  }, [scope, page, retry]);
  const url = '/cms-preview?' + scope + '&themeId=' + encodeURIComponent(themeId) + '&pageId=' + encodeURIComponent(pageId) + '&refresh=' + retry;
  return <section aria-label="Theme preview" className="mt-6 border border-slate-300 bg-white p-4">
    <p className="mb-4 text-sm text-slate-600">Preview shows published content. Selecting a theme here does not activate it.</p>
    {error ? <p role="alert">{error}</p> : null}
    {!result && !error ? <p role="status">Loading published pages…</p> : null}
    {result?.pages.length === 0 ? <p>Publish a page to preview this theme. <Link className="underline" href={'/vibes/pages?' + scope}>Open Pages</Link></p> : null}
    <div className="mb-4 flex flex-wrap items-end gap-3">
      {result && result.pages.length > 0 ? <label className="text-sm">Published page<select value={pageId} onChange={(event) => setPageId(event.target.value)} className="ml-2 max-w-full border py-2 pl-2 pr-8">
        {result.pages.map((item) => <option key={item.pageId} value={item.pageId}>{item.title} — /{item.routePath || item.slug}</option>)}
      </select></label> : null}
      {result && result.totalPages > 1 ? <><button disabled={page === 1} onClick={() => setPage(page - 1)}>Previous pages</button><span>{page} / {result.totalPages}</span><button disabled={page >= result.totalPages} onClick={() => setPage(page + 1)}>Next pages</button></> : null}
      <label className="text-sm">Viewport<select value={width} onChange={(event) => setWidth(event.target.value)} className="ml-2 border py-2 pl-2 pr-8"><option value="100%">Desktop</option><option value="768px">Tablet</option><option value="390px">Phone</option></select></label>
      <button type="button" className="border px-3 py-2 text-sm" onClick={() => setRetry(retry + 1)}>Refresh preview</button>
    </div>
    {pageId ? <><p role="status" className="text-sm">{loadedUrl === url ? 'Published page preview' : 'Loading preview…'}</p><div className="overflow-x-auto bg-slate-100 p-2"><iframe key={url} src={url} title="Published page theme preview" onLoad={() => setLoadedUrl(url)} onError={() => setError('Preview failed to load. Try Refresh preview.')} className="mx-auto h-[700px] max-w-full border bg-white" style={{ width }} /></div></> : null}
  </section>;
}
