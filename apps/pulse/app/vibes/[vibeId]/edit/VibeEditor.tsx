'use client';

import Link from 'next/link';
import React from 'react';
import { useEffect, useRef, useState } from 'react';
import { listVibeTaxonomyTerms } from '@/lib/cms/taxonomy';
import { VibeEditorToolbar } from '../../_components/VibeEditorToolbar';
import { VibePanel } from '../../_components/VibePanel';

type Vibe = {
  vibeId: string;
  title?: string;
  name?: string;
  slug?: string;
  status?: string;
  description?: string;
  longDescription?: string;
  publishedRevisionId?: string;
  currentDraftVersion?: number;
  draftPayload?: any;
};

type SaveState = 'saved' | 'dirty' | 'saving' | 'conflict';

const defaults = {
  tokens: {
    visual: {
      theme: {
        colors: { primary: '#2563eb', background: '#0f172a', surface: '#1e293b', textPrimary: '#f8fafc', textSecondary: '#cbd5e1' },
        typography: { fontFamilyHeading: 'Inter', fontFamilyBody: 'Inter', baseFontSize: '16px' },
        layout: {},
      },
      effects: {},
    },
    linguistic: { voice: { primaryTone: 'warm' }, vocabulary: {}, systemDirectives: ['Be clear, useful, and grounded.'] },
  },
  source: { kind: 'manual' },
};

function label(status: string) {
  return status.replace(/_/g, ' ');
}

function workflowAction(status: string, vibeId: string) {
  if (status === 'draft') return { href: `/vibes/${vibeId}/submit`, label: 'Submit for review', description: 'Send this saved draft to the review queue.' };
  if (status === 'in_review') return { href: `/vibes/${vibeId}/publish`, label: 'Publish revision', description: 'Create the next immutable published revision.' };
  return { href: `/vibes/${vibeId}/actions`, label: 'Manage status', description: 'Review available lifecycle actions.' };
}

function PublishPanel({ vibe, status, saveState, error }: { vibe: Vibe; status: string; saveState: SaveState; error: string }) {
  const action = workflowAction(status, vibe.vibeId);
  const stateText = saveState === 'saved' ? 'Saved' : saveState === 'dirty' ? 'Unsaved changes' : saveState === 'saving' ? 'Saving…' : 'Conflict detected';
  const stateClass = saveState === 'conflict' ? 'text-red-700' : saveState === 'dirty' ? 'text-amber-700' : 'text-slate-500';

  return (
    <aside className="h-fit rounded-xl border border-slate-200 bg-white shadow-sm lg:sticky lg:top-5">
      <div className="border-b border-slate-200 p-5">
        <h2 className="text-sm font-black uppercase tracking-wide text-slate-500">Publish</h2>
        <p aria-live="polite" className={`mt-2 text-xs font-bold ${stateClass}`}>{stateText}</p>
      </div>
      <div className="space-y-4 p-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Status</p>
          <p className="mt-1 inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-bold capitalize">{label(status)}</p>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Vibe URL</p>
          <p className="mt-1 break-all font-mono text-xs text-slate-700">/{vibe.slug || vibe.vibeId}</p>
          <p className="mt-1 text-xs text-slate-500">Change the slug in Metadata and save the draft to update it.</p>
        </div>
        <dl className="space-y-3 border-y border-slate-100 py-4 text-sm">
          <div className="flex justify-between gap-3"><dt className="text-slate-500">Draft version</dt><dd className="font-semibold">{vibe.currentDraftVersion ?? 0}</dd></div>
          <div className="flex justify-between gap-3"><dt className="text-slate-500">Published revision</dt><dd className="font-semibold">{vibe.publishedRevisionId ? 'Available' : 'None'}</dd></div>
        </dl>
        {error ? <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
        {saveState === 'conflict' ? <button type="button" onClick={() => window.location.reload()} className="text-sm font-bold text-[#2271b1] hover:underline">Reload latest draft</button> : null}
        <button type="submit" disabled={saveState === 'saving'} className="w-full rounded-lg bg-slate-900 px-3 py-2 text-sm font-bold text-white disabled:opacity-50">{saveState === 'saving' ? 'Saving…' : saveState === 'dirty' ? 'Save changes' : 'Save draft'}</button>
        <Link href={`/vibes/${vibe.vibeId}/preview`} className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-center text-sm font-bold text-slate-800">Preview</Link>
        <Link href={action.href} className="block w-full rounded-lg border border-[#2271b1] px-3 py-2 text-center text-sm font-bold text-[#2271b1]">{action.label}</Link>
        <p className="text-xs text-slate-500">{action.description}</p>
        <Link href={`/vibes/${vibe.vibeId}/revisions`} className="block text-sm font-bold text-[#2271b1] hover:underline">View revision history</Link>
      </div>
    </aside>
  );
}

export function VibeEditor({ vibeId }: { vibeId: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [vibe, setVibe] = useState<Vibe | null>(null);
  const [error, setError] = useState('');
  const [saveState, setSaveState] = useState<SaveState>('saved');
  const [settingsOpen, setSettingsOpen] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/vibes/${encodeURIComponent(vibeId)}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error('Unable to load vibe.');
        return response.json();
      })
      .then((payload) => setVibe(payload.vibe))
      .catch((reason: unknown) => {
        if (!(reason instanceof Error) || reason.name !== 'AbortError') setError(reason instanceof Error ? reason.message : 'Unable to load vibe.');
      });
    return () => controller.abort();
  }, [vibeId]);

  if (error && !vibe) return <main className="min-h-screen bg-slate-100 p-8"><p role="alert" className="text-red-700">{error}</p></main>;
  if (!vibe) return <main className="min-h-screen bg-slate-100 p-8 text-slate-500">Loading vibe…</main>;

  const draft = vibe.draftPayload || {
    ...defaults,
    title: vibe.title || vibe.name || '',
    slug: vibe.slug || vibe.vibeId,
    description: vibe.longDescription || vibe.description || '',
  };
  const status = vibe.status || 'draft';
  const currentDraftVersion = vibe.currentDraftVersion ?? 0;
  const taxonomyTerms = listVibeTaxonomyTerms();
  const selectedTaxonomyTerms = new Set(draft.taxonomyTermIds || []);
  const typography = { ...defaults.tokens.visual.theme.typography, ...(draft.tokens.visual.theme.typography || {}) };
  const layout = { borderRadius: 'md', spacingBasePx: 4, elevation: 'subtle', ...(draft.tokens.visual.theme.layout || {}) };

  async function saveDraft(form: HTMLFormElement) {
    setSaveState('saving');
    setError('');
    const data = new FormData(form);
    const sourceUrl = String(data.get('sourceUrl')).trim();
    const sourceWithoutUrl = { ...(draft.source || {}) };
    delete sourceWithoutUrl.url;
    const next = {
      ...draft,
      title: String(data.get('title')),
      slug: String(data.get('slug')),
      description: String(data.get('description')),
      taxonomyTermIds: data.getAll('taxonomyTermIds').map(String),
      source: { ...sourceWithoutUrl, kind: String(data.get('sourceKind')), ...(sourceUrl ? { url: sourceUrl } : {}), attribution: String(data.get('sourceAttribution')), ownershipNote: String(data.get('sourceOwnershipNote')) },
      tokens: {
        ...draft.tokens,
        visual: { ...draft.tokens.visual, theme: { ...draft.tokens.visual.theme, colors: { ...draft.tokens.visual.theme.colors, primary: String(data.get('primary')), background: String(data.get('background')), surface: String(data.get('surface')), textPrimary: String(data.get('textPrimary')), textSecondary: String(data.get('textSecondary')) }, typography: { ...typography, fontFamilyHeading: String(data.get('fontFamilyHeading')), fontFamilyBody: String(data.get('fontFamilyBody')), baseFontSize: String(data.get('baseFontSize')), scaleRatio: Number(data.get('scaleRatio')), fontWeightNormal: Number(data.get('fontWeightNormal')), fontWeightBold: Number(data.get('fontWeightBold')) }, layout: { ...layout, borderRadius: String(data.get('borderRadius')), spacingBasePx: Number(data.get('spacingBasePx')), elevation: String(data.get('elevation')) } } },
        linguistic: { ...draft.tokens.linguistic, voice: { ...draft.tokens.linguistic.voice, primaryTone: String(data.get('primaryTone')) } },
      },
    };

    try {
      const response = await fetch(`/api/vibes/${encodeURIComponent(vibeId)}?tenantId=default`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ draft: next, expectedVersion: currentDraftVersion }) });
      const payload = await response.json();
      if (!response.ok) {
        if (response.status === 409 || payload.code === 'VIBE_DRAFT_CONFLICT') {
          setSaveState('conflict');
          setError('This draft changed in another session. Reload before saving again.');
        } else {
          setSaveState('dirty');
          setError(payload.error || 'Draft could not be saved.');
        }
        return;
      }
      setVibe(payload.vibe);
      setSaveState('saved');
    } catch {
      setSaveState('dirty');
      setError('Draft could not be saved. Check your connection and try again.');
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-8 text-slate-900 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <form ref={formRef} onChange={() => { if (saveState !== 'saving') setSaveState('dirty'); }} onSubmit={(event) => { event.preventDefault(); void saveDraft(event.currentTarget); }}>
          <VibeEditorToolbar title={draft.title || 'Edit Vibe'} dirty={saveState === 'dirty'} conflict={saveState === 'conflict'} saving={saveState === 'saving'} previewHref={`/vibes/${vibeId}/preview`} settingsOpen={settingsOpen} onToggleSettings={() => setSettingsOpen((open) => !open)} onSave={() => formRef.current?.requestSubmit()} />

          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
            <section className="order-2 space-y-4 lg:order-1">
              <VibePanel id="metadata" title="Metadata" defaultOpen>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <label className="text-xs font-bold uppercase text-slate-500">Title<input name="title" defaultValue={draft.title} className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-normal normal-case" /></label>
                  <label className="text-xs font-bold uppercase text-slate-500">Slug<input name="slug" defaultValue={draft.slug} className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-sm font-normal normal-case" /></label>
                  <label className="text-xs font-bold uppercase text-slate-500 sm:col-span-2">Description<textarea name="description" defaultValue={draft.description} className="mt-2 min-h-28 w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-normal normal-case" /></label>
                </div>
              </VibePanel>

              <VibePanel id="taxonomy" title="Taxonomy" defaultOpen>
                <p className="mt-1 text-sm text-slate-500">Choose terms that help operators find this Vibe later.</p>
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  {taxonomyTerms.map(({ id, group, term }) => <label key={id} className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm"><input name="taxonomyTermIds" type="checkbox" value={id} defaultChecked={selectedTaxonomyTerms.has(id)} /><span className="font-semibold capitalize">{term.replace(/-/g, ' ')}</span><span className="ml-auto text-xs capitalize text-slate-400">{group.replace(/([A-Z])/g, ' $1')}</span></label>)}
                </div>
              </VibePanel>

              <div hidden={!settingsOpen}>
              <VibePanel id="source-details" title="Source details" defaultOpen={false}>
                <p className="mt-1 text-sm text-slate-500">Keep the provenance needed for later editorial review.</p>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <label className="text-xs font-bold uppercase text-slate-500">Source kind<select name="sourceKind" defaultValue={draft.source?.kind || 'manual'} className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-normal normal-case"><option value="manual">Manual</option><option value="extracted">Extracted</option></select></label>
                  <label className="text-xs font-bold uppercase text-slate-500">Source URL<input name="sourceUrl" type="url" defaultValue={draft.source?.url || ''} placeholder="https://…" className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-normal normal-case" /></label>
                  <label className="text-xs font-bold uppercase text-slate-500 sm:col-span-2">Attribution<input name="sourceAttribution" defaultValue={draft.source?.attribution || ''} className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-normal normal-case" /></label>
                  <label className="text-xs font-bold uppercase text-slate-500 sm:col-span-2">Ownership note<textarea name="sourceOwnershipNote" defaultValue={draft.source?.ownershipNote || ''} className="mt-2 min-h-20 w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-normal normal-case" /></label>
                </div>
              </VibePanel>

              <VibePanel id="colors" title="Colors" defaultOpen>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  {(['primary', 'background', 'surface', 'textPrimary', 'textSecondary'] as const).map((key) => <label key={key} className="text-xs font-bold uppercase text-slate-500">{key}<input name={key} type="color" defaultValue={draft.tokens.visual.theme.colors[key]} className="mt-2 block h-10 w-full rounded border border-slate-300 bg-white p-1" /></label>)}
                </div>
              </VibePanel>
              <VibePanel id="typography" title="Typography" defaultOpen>
                <div className="mt-6 border-t border-slate-100 pt-5">
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <label className="text-xs font-bold uppercase text-slate-500">Heading font<input name="fontFamilyHeading" defaultValue={typography.fontFamilyHeading} className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-normal normal-case" /></label>
                    <label className="text-xs font-bold uppercase text-slate-500">Body font<input name="fontFamilyBody" defaultValue={typography.fontFamilyBody} className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-normal normal-case" /></label>
                    <label className="text-xs font-bold uppercase text-slate-500">Base font size<input name="baseFontSize" defaultValue={typography.baseFontSize} pattern="\d+(?:\.\d+)?(?:px|rem|em|vh|vw|%)" aria-describedby="base-font-size-help" className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-normal normal-case" /><span id="base-font-size-help" className="mt-1 block text-xs font-normal normal-case text-slate-500">Use a number followed by px, rem, em, vh, vw, or % (for example, 16px).</span></label>
                    <label className="text-xs font-bold uppercase text-slate-500">Scale ratio<input name="scaleRatio" type="number" min="1" max="2.5" step="0.05" defaultValue={typography.scaleRatio} className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-normal normal-case" /></label>
                    <label className="text-xs font-bold uppercase text-slate-500">Normal weight<input name="fontWeightNormal" type="number" min="100" max="900" step="100" defaultValue={typography.fontWeightNormal} className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-normal normal-case" /></label>
                    <label className="text-xs font-bold uppercase text-slate-500">Bold weight<input name="fontWeightBold" type="number" min="100" max="900" step="100" defaultValue={typography.fontWeightBold} className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-normal normal-case" /></label>
                  </div>
                </div>
              </VibePanel>
              <VibePanel id="layout" title="Layout" defaultOpen>
                <div className="mt-6 border-t border-slate-100 pt-5">
                  <div className="mt-4 grid gap-4 sm:grid-cols-3">
                    <label className="text-xs font-bold uppercase text-slate-500">Corner radius<select name="borderRadius" defaultValue={layout.borderRadius} className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-normal normal-case"><option value="none">None</option><option value="sm">Small</option><option value="md">Medium</option><option value="lg">Large</option><option value="full">Full</option></select></label>
                    <label className="text-xs font-bold uppercase text-slate-500">Base spacing (px)<input name="spacingBasePx" type="number" min="1" max="64" defaultValue={layout.spacingBasePx} className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-normal normal-case" /></label>
                    <label className="text-xs font-bold uppercase text-slate-500">Elevation<select name="elevation" defaultValue={layout.elevation} className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-normal normal-case"><option value="flat">Flat</option><option value="subtle">Subtle</option><option value="medium">Medium</option><option value="high">High</option></select></label>
                  </div>
                </div>
              </VibePanel>

              <VibePanel id="voice" title="Jamie voice" defaultOpen={false}>
                <label className="mt-4 block text-xs font-bold uppercase text-slate-500">Primary tone<select name="primaryTone" defaultValue={draft.tokens.linguistic.voice.primaryTone} className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-normal normal-case"><option>warm</option><option>concise</option><option>analytical</option><option>energetic</option><option>tactical</option><option>luxurious</option><option>playful</option></select></label>
              </VibePanel>
              </div>
            </section>

            <aside className="order-1 self-start lg:sticky lg:top-4 lg:order-2" aria-label="Vibe publishing and settings">
              <PublishPanel vibe={vibe} status={status} saveState={saveState} error={error} />
            </aside>
          </div>
        </form>
      </div>
    </div>
  );
}
