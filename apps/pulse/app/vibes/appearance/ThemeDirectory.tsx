'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { z } from 'zod';
import { VibePageHeader } from '../_components/VibePageHeader';
import { ThemePreview } from './ThemePreview';

const catalogSchema = z.object({
  themes: z.array(z.object({ id: z.string(), name: z.string(), version: z.string(), description: z.string(), supportedBlocks: z.array(z.string()) })),
  activeThemeId: z.string(),
});

async function readCatalog(scope: string, signal?: AbortSignal) {
  const response = await fetch('/api/vibes/themes?' + scope, { signal });
  if (!response.ok) throw new Error('Themes could not be loaded.');
  return catalogSchema.parse(JSON.parse(await response.text()));
}

export function ThemeDirectory() {
  const router = useRouter();
  const params = useSearchParams();
  const siteId = params.get('siteId')?.trim() || '';
  const tenantId = params.get('tenantId')?.trim() || '';
  const scope = new URLSearchParams({ siteId, ...(tenantId ? { tenantId } : {}) }).toString();
  const [site, setSite] = useState(siteId);
  useEffect(() => setSite(siteId), [siteId]);
  return <section className="min-h-screen bg-slate-100 px-4 py-8 text-slate-900 sm:px-8"><div className="mx-auto max-w-7xl">
    <VibePageHeader eyebrow="Appearance" title="Themes" description="Choose the presentation package used by this site." />
    <form className="mb-5 flex gap-2 bg-white p-4" onSubmit={(event) => {
      event.preventDefault();
      router.push('/vibes/appearance?' + new URLSearchParams({ siteId: site.trim(), ...(tenantId ? { tenantId } : {}) }));
    }}>
      <label className="min-w-0 flex-1 text-sm font-semibold">Site ID<input required value={site} onChange={(event) => setSite(event.target.value)} className="mt-1 w-full rounded border px-3 py-2 font-normal" /></label>
      <button className="self-end rounded bg-[#2271b1] px-4 py-2 text-sm font-semibold text-white">Open themes</button>
    </form>
    {siteId ? <ScopedThemes key={scope} scope={scope} /> : <p>Enter a site ID to manage its theme.</p>}
  </div></section>;
}

function ScopedThemes({ scope }: { scope: string }) {
  const [catalog, setCatalog] = useState<z.infer<typeof catalogSchema> | null>(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState('');
  const [previewId, setPreviewId] = useState('');
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    const controller = new AbortController();
    readCatalog(scope, controller.signal).then((body) => { if (!controller.signal.aborted) setCatalog(body); })
      .catch(() => { if (!controller.signal.aborted) setMessage('Themes could not be loaded. Reopen this site to retry.'); });
    return () => { alive.current = false; controller.abort(); };
  }, [scope]);
  async function activate(themeId: string) {
    setBusy(themeId); setMessage('');
    try {
      const response = await fetch('/api/vibes/themes?' + scope, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ themeId }) });
      if (!response.ok) throw new Error('Theme could not be activated.');
      const refreshed = await readCatalog(scope);
      if (alive.current) { setCatalog(refreshed); setMessage('Theme activated.'); }
    } catch (error) {
      if (alive.current) setMessage(error instanceof Error ? error.message : 'Theme state could not be refreshed.');
    } finally { if (alive.current) setBusy(''); }
  }
  return <>
    {message ? <p role="status" className="mb-4 border-l-4 border-[#2271b1] bg-white p-3 text-sm">{message}</p> : null}
    {!catalog && !message ? <p role="status">Loading themes…</p> : null}
    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{catalog?.themes.map((theme) => <article key={theme.id} className="overflow-hidden border border-slate-300 bg-white">
      <div aria-hidden="true" className={'aspect-[4/3] p-6 ' + (theme.id === 'sunset/editorial' ? 'bg-[#faf8f3] text-stone-800' : 'bg-slate-900 text-white')}>
        <p className="border-b border-current/30 pb-3 text-xs">Theme illustration</p>
        <p className={'mt-8 text-3xl ' + (theme.id === 'sunset/editorial' ? 'text-center font-serif' : 'font-sans font-bold')}>{theme.name}</p>
        <div className="mt-6 h-2 w-3/4 bg-current opacity-15" /><div className="mt-3 h-2 w-1/2 bg-current opacity-15" />
      </div>
      <div className="p-4"><div className="flex justify-between gap-2"><h2 className="font-semibold">{theme.name}</h2>{catalog.activeThemeId === theme.id ? <span className="text-xs font-bold text-emerald-700">Active</span> : null}</div>
        <p className="mt-2 text-sm text-slate-600">{theme.description}</p><p className="mt-2 text-xs text-slate-500">Version {theme.version}</p>
        <div className="mt-4 flex flex-wrap gap-2"><button type="button" disabled={catalog.activeThemeId === theme.id || !!busy} onClick={() => void activate(theme.id)} className="rounded border border-[#2271b1] px-3 py-2 text-sm text-[#2271b1] disabled:opacity-40">{busy === theme.id ? 'Activating…' : catalog.activeThemeId === theme.id ? 'Active theme' : 'Activate'}</button>
          <button type="button" aria-label={'Preview ' + theme.name} onClick={() => setPreviewId(theme.id)} className="rounded border px-3 py-2 text-sm">Live preview</button></div>
      </div>
    </article>)}</div>
    {previewId ? <><div className="mt-6 flex items-center justify-between"><h2 className="font-semibold">{catalog?.themes.find((theme) => theme.id === previewId)?.name}</h2><button onClick={() => setPreviewId('')} className="underline">Close preview</button></div><ThemePreview scope={scope} themeId={previewId} /></> : null}
  </>;
}
