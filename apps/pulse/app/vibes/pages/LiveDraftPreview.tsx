'use client';

import React, { useEffect, useId, useRef, useState } from 'react';
import { bundledExtensionCatalog } from '@/lib/cms/extensions/catalog';
import { cmsPageDraftSchema, type CmsPageDraft } from '@/lib/cms/pages/pageSchema';
import { livePreviewReadySchema } from '@/lib/cms/themes/livePreviewContract';

export function LiveDraftPreview({ draft, siteId, pageId, tenantId = 'default', dirty }: {
  draft: CmsPageDraft; siteId: string; pageId: string; tenantId?: string; dirty: boolean;
}) {
  const channel = useId();
  const frame = useRef<HTMLIFrameElement>(null);
  const [ready, setReady] = useState(false);
  const [themeId, setThemeId] = useState('sunset/core');
  const [width, setWidth] = useState('100%');
  const [retry, setRetry] = useState(0);
  const [connectionError, setConnectionError] = useState('');
  const sequence = useRef(0);
  const latest = useRef({ draft, themeId });
  latest.current = { draft, themeId };
  const valid = cmsPageDraftSchema.safeParse(draft).success;
  useEffect(() => {
    setConnectionError('');
    if (ready) return;
    const timer = setTimeout(() => setConnectionError('Preview has not connected. Check the message in the frame, then use Reconnect.'), 15000);
    return () => clearTimeout(timer);
  }, [ready, retry]);
  const sendLatest = () => {
    const parsed = cmsPageDraftSchema.safeParse(latest.current.draft);
    if (!parsed.success) return;
    frame.current?.contentWindow?.postMessage({
      type: 'cms-preview:update', channel, sequence: ++sequence.current,
      draft: parsed.data, themeId: latest.current.themeId,
    }, window.location.origin);
  };
  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (event.source !== frame.current?.contentWindow || event.origin !== window.location.origin) return;
      const parsed = livePreviewReadySchema.safeParse(event.data);
      if (!parsed.success || parsed.data.channel !== channel) return;
      setReady(true); sendLatest();
    };
    window.addEventListener('message', receive);
    return () => window.removeEventListener('message', receive);
  }, [channel]);
  useEffect(() => {
    if (!ready) return;
    const handle = requestAnimationFrame(sendLatest);
    return () => cancelAnimationFrame(handle);
  }, [draft, themeId, ready]);
  const src = '/cms-preview?' + new URLSearchParams({ siteId, tenantId, pageId, themeId: 'sunset/core', mode: 'draft', channel, refresh: String(retry) });
  return <section aria-label="Live draft preview" className="my-5 border bg-white p-4">
    <div className="mb-3 flex flex-wrap items-center gap-3">
      <h2 className="font-semibold">Live preview</h2>
      <span role="status" className="text-sm">{!ready ? 'Connecting preview…' : dirty ? 'Unsaved draft' : 'Saved draft'}</span>
      <label>Preview theme<select value={themeId} onChange={(event) => setThemeId(event.target.value)} className="ml-2 border py-2 pl-2 pr-8">{bundledExtensionCatalog.themes.map((theme) => <option key={theme.id} value={theme.id}>{theme.name}</option>)}</select></label>
      <label>Preview width<select value={width} onChange={(event) => setWidth(event.target.value)} className="ml-2 border py-2 pl-2 pr-8"><option value="100%">Desktop</option><option value="768px">Tablet</option><option value="390px">Phone</option></select></label>
      <button type="button" onClick={() => { setReady(false); setRetry(retry + 1); }} className="border px-3 py-2">Reconnect</button>
    </div>
    <p className="mb-3 text-sm text-slate-600">Updates as you type. Theme selection previews only; publish separately to update the site.</p>
    {!valid ? <p role="alert">Fix the invalid field to resume preview updates. Your text is retained; preview shows the last valid draft.</p> : null}
    {connectionError ? <p role="alert">{connectionError}</p> : null}
    <div className="overflow-x-auto bg-slate-100 p-2"><iframe key={src} ref={frame} src={src} title="Live homepage and page preview" onLoad={() => {
      frame.current?.contentWindow?.postMessage({ type: 'cms-preview:connect', channel }, window.location.origin);
    }} className="mx-auto h-[650px] max-w-full border bg-white" style={{ width }} /></div>
  </section>;
}
