'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

type Vibe = { vibeId: string; title?: string; name?: string; slug?: string; status?: string; description?: string; longDescription?: string; publishedRevisionId?: string; currentDraftVersion?: number; draftPayload?: any };
type SaveState = 'saved' | 'dirty' | 'saving' | 'conflict';

const defaults = { tokens: { visual: { theme: { colors: { primary: '#2563eb', background: '#0f172a', surface: '#1e293b', textPrimary: '#f8fafc', textSecondary: '#cbd5e1' }, typography: { fontFamilyHeading: 'Inter', fontFamilyBody: 'Inter', baseFontSize: '16px' }, layout: {} }, effects: {} }, linguistic: { voice: { primaryTone: 'warm' }, vocabulary: {}, systemDirectives: ['Be clear, useful, and grounded.'] } }, source: { kind: 'manual' } };

function label(status: string) { return status.replace(/_/g, ' '); }

export function VibeEditor({ vibeId }: { vibeId: string }) {
  const [vibe, setVibe] = useState<Vibe | null>(null);
  const [error, setError] = useState('');
  const [saveState, setSaveState] = useState<SaveState>('saved');

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/vibes/${encodeURIComponent(vibeId)}`, { signal: controller.signal })
      .then(async (response) => { if (!response.ok) throw new Error('Unable to load vibe.'); return response.json(); })
      .then((payload) => setVibe(payload.vibe))
      .catch((reason: unknown) => { if (!(reason instanceof Error) || reason.name !== 'AbortError') setError(reason instanceof Error ? reason.message : 'Unable to load vibe.'); });
    return () => controller.abort();
  }, [vibeId]);

  if (error && !vibe) return <main className="min-h-screen bg-slate-100 p-8"><p role="alert" className="text-red-700">{error}</p></main>;
  if (!vibe) return <main className="min-h-screen bg-slate-100 p-8 text-slate-500">Loading vibe…</main>;
  const draft = vibe.draftPayload || { ...defaults, title: vibe.title || vibe.name || '', slug: vibe.slug || vibe.vibeId, description: vibe.longDescription || vibe.description || '' };

  async function saveDraft(form: HTMLFormElement) {
    setSaveState('saving'); setError('');
    const data = new FormData(form);
    const next = { ...draft, title: String(data.get('title')), slug: String(data.get('slug')), description: String(data.get('description')), tokens: { ...draft.tokens, visual: { ...draft.tokens.visual, theme: { ...draft.tokens.visual.theme, colors: { ...draft.tokens.visual.theme.colors, primary: String(data.get('primary')), background: String(data.get('background')), surface: String(data.get('surface')), textPrimary: String(data.get('textPrimary')), textSecondary: String(data.get('textSecondary')) } } }, linguistic: { ...draft.tokens.linguistic, voice: { ...draft.tokens.linguistic.voice, primaryTone: String(data.get('primaryTone')) } } } };
    try {
      const response = await fetch(`/api/vibes/${encodeURIComponent(vibeId)}?tenantId=default`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ draft: next, expectedVersion: vibe.currentDraftVersion ?? 0 }) });
      const payload = await response.json();
      if (!response.ok) {
        if (response.status === 409 || payload.code === 'VIBE_DRAFT_CONFLICT') { setSaveState('conflict'); setError('This draft changed in another session. Reload before saving again.'); }
        else { setSaveState('dirty'); setError(payload.error || 'Draft could not be saved.'); }
        return;
      }
      setVibe(payload.vibe); setSaveState('saved');
    } catch { setSaveState('dirty'); setError('Draft could not be saved. Check your connection and try again.'); }
  }

  const saveText = saveState === 'saving' ? 'Saving…' : saveState === 'dirty' ? 'Save changes' : 'Save draft';
  const stateText = saveState === 'saved' ? 'Saved' : saveState === 'dirty' ? 'Unsaved changes' : saveState === 'saving' ? 'Saving…' : 'Conflict detected';
  const status = vibe.status || 'draft';

  return <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-900 sm:px-8"><div className="mx-auto max-w-6xl"><form onChange={() => { if (saveState !== 'saving') setSaveState('dirty'); }} onSubmit={(event) => { event.preventDefault(); void saveDraft(event.currentTarget); }}><div className="mb-6 flex flex-wrap items-start justify-between gap-4"><div><Link href="/vibes" className="text-sm font-semibold text-slate-500 hover:underline">← All vibes</Link><h1 className="mt-3 text-3xl font-black">Edit vibe</h1><p className="mt-1 text-sm text-slate-500">/{vibe.slug || vibe.vibeId}</p></div><div className="flex items-center gap-3"><p aria-live="polite" className={`text-xs font-bold ${saveState === 'conflict' ? 'text-red-700' : saveState === 'dirty' ? 'text-amber-700' : 'text-slate-500'}`}>{stateText}</p><Link href={`/vibes/${vibeId}/revisions`} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-bold">Revision history</Link><button className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-bold text-white disabled:opacity-50" disabled={saveState === 'saving'}>{saveText}</button></div></div><div className="grid gap-5 lg:grid-cols-[1fr_320px]"><section className="space-y-5"><article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-sm font-black uppercase tracking-wide text-slate-500">Metadata</h2><div className="mt-4 grid gap-4 sm:grid-cols-2"><label className="text-xs font-bold uppercase text-slate-500">Title<input name="title" defaultValue={draft.title} className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-normal normal-case" /></label><label className="text-xs font-bold uppercase text-slate-500">Slug<input name="slug" defaultValue={draft.slug} className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-sm font-normal normal-case" /></label><label className="text-xs font-bold uppercase text-slate-500 sm:col-span-2">Description<textarea name="description" defaultValue={draft.description} className="mt-2 min-h-28 w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-normal normal-case" /></label></div></article><article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-sm font-black uppercase tracking-wide text-slate-500">Visual theme</h2><div className="mt-4 grid gap-4 sm:grid-cols-2">{(['primary', 'background', 'surface', 'textPrimary', 'textSecondary'] as const).map((key) => <label key={key} className="text-xs font-bold uppercase text-slate-500">{key}<input name={key} type="color" defaultValue={draft.tokens.visual.theme.colors[key]} className="mt-2 block h-10 w-full rounded border border-slate-300 bg-white p-1" /></label>)}</div></article><article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-sm font-black uppercase tracking-wide text-slate-500">Jamie voice</h2><label className="mt-4 block text-xs font-bold uppercase text-slate-500">Primary tone<select name="primaryTone" defaultValue={draft.tokens.linguistic.voice.primaryTone} className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-normal normal-case"><option>warm</option><option>concise</option><option>analytical</option><option>energetic</option><option>tactical</option><option>luxurious</option><option>playful</option></select></label></article></section><aside className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-sm font-black uppercase tracking-wide text-slate-500">Editorial status</h2><p className="mt-3 inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-bold capitalize">{label(status)}</p>{error ? <p role="alert" className="mt-4 text-sm text-red-700">{error}</p> : null}{saveState === 'conflict' ? <button type="button" onClick={() => window.location.reload()} className="mt-3 text-sm font-bold text-[#2271b1] hover:underline">Reload latest draft</button> : null}<dl className="mt-5 space-y-3 text-sm"><div className="flex justify-between gap-3"><dt className="text-slate-500">Draft version</dt><dd className="font-semibold">{vibe.currentDraftVersion ?? 0}</dd></div><div className="flex justify-between gap-3"><dt className="text-slate-500">Published revision</dt><dd className="font-semibold">{vibe.publishedRevisionId ? 'Assigned' : 'None'}</dd></div></dl></aside></div></form></div></main>;
}
