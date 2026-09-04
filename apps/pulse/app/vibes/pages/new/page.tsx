'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import React, { Suspense, useEffect, useState } from 'react';
import { VibePageHeader } from '../../_components/VibePageHeader';
import { toVibeSlug } from '@/lib/cms/vibeSlug';

type ParentPage = { pageId: string; title: string; routePath?: string; slug: string };

export default function NewPageRoute() {
  return <Suspense fallback={<p className="p-8 text-sm text-slate-500">Loading page form…</p>}><NewPageForm /></Suspense>;
}

function NewPageForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const siteId = searchParams.get('siteId')?.trim() || '';
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [slugEdited, setSlugEdited] = useState(false);
  const [parentPageId, setParentPageId] = useState('');
  const [parents, setParents] = useState<ParentPage[]>([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!siteId) return;
    const controller = new AbortController();
    fetch(`/api/vibes/pages?siteId=${encodeURIComponent(siteId)}&pageSize=100`, { signal: controller.signal })
      .then(async (response) => response.ok ? readJson(response) : null)
      .then((payload) => {
        const pages = Array.isArray(payload?.pages) ? payload.pages as Array<ParentPage & { status?: string }> : [];
        setParents(pages.filter((page) => page.status !== 'trash' && page.routePath !== 'home'));
      })
      .catch(() => setParents([]));
    return () => controller.abort();
  }, [siteId]);

  async function createPage() {
    if (!siteId) { setError('Choose a site from the Pages screen first.'); return; }
    setSaving(true); setError('');
    try {
      const response = await fetch(`/api/vibes/pages?siteId=${encodeURIComponent(siteId)}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ title, slug, ...(parentPageId ? { parentPageId } : {}) }) });
      const payload = await readJson(response);
      if (!response.ok) throw new Error(payload?.error || 'Unable to create page.');
      router.push(`/vibes/pages?siteId=${encodeURIComponent(siteId)}&created=${encodeURIComponent(payload.page.pageId)}`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to create page.');
    } finally { setSaving(false); }
  }

  return <div className="min-h-screen bg-slate-100 px-4 py-8 text-slate-900 sm:px-8"><div className="mx-auto max-w-3xl">
    <VibePageHeader title="Add New Page" description="Create the page identity before adding structured content." backHref={siteId ? `/vibes/pages?siteId=${encodeURIComponent(siteId)}` : '/vibes/pages'} backLabel="All Pages" />
    {!siteId ? <div className="mt-6 border-l-4 border-amber-500 bg-white p-4 text-sm">Open a site from <Link href="/vibes/pages" className="font-semibold text-[#2271b1] underline">Pages</Link> before adding content.</div> : <form className="mt-6 space-y-5 border border-slate-200 bg-white p-6" onSubmit={(event) => { event.preventDefault(); void createPage(); }}>
      <p className="text-sm text-slate-500">Site: <strong className="font-mono text-slate-800">{siteId}</strong></p>
      <label className="block text-sm font-semibold">Title<input required value={title} onChange={(event) => { const value = event.target.value; setTitle(value); if (!slugEdited) setSlug(toVibeSlug(value)); }} className="mt-2 w-full rounded border border-slate-300 px-3 py-2 font-normal" /></label>
      <label className="block text-sm font-semibold" htmlFor="page-slug">URL slug</label><input id="page-slug" aria-describedby="page-slug-help" required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" value={slug} onChange={(event) => { setSlug(event.target.value.toLowerCase()); setSlugEdited(true); }} className="mt-2 w-full rounded border border-slate-300 px-3 py-2 font-mono font-normal" /><span id="page-slug-help" className="mt-1 block text-xs font-normal text-slate-500">The final part of the public URL. Use <code>home</code> for the site homepage.</span>
      <label className="block text-sm font-semibold" htmlFor="parent-page">Parent page</label><select id="parent-page" aria-describedby="parent-page-help" value={parentPageId} onChange={(event) => setParentPageId(event.target.value)} className="mt-2 w-full rounded border border-slate-300 bg-white px-3 py-2 font-normal"><option value="">No parent</option>{parents.map((page) => <option key={page.pageId} value={page.pageId}>{page.title} — /{page.routePath || page.slug}</option>)}</select><span id="parent-page-help" className="mt-1 block text-xs font-normal text-slate-500">Optional. A parent creates a nested URL such as /about/team.</span>
      {error ? <p role="alert" className="text-sm text-red-700">{error}</p> : null}
      <button disabled={saving || !title || !slug} className="rounded bg-[#2271b1] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{saving ? 'Creating…' : 'Create Page'}</button>
    </form>}
  </div></div>;
}

async function readJson(response: Response) {
  const text = await response.text();
  if (!text.trim()) return null;
  try { return JSON.parse(text); } catch { return null; }
}
