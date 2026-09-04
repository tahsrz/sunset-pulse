'use client';

import React, { useState } from 'react';
import { VibePageHeader } from '../../../_components/VibePageHeader';
import { VibeStatusBadge } from '../../../_components/VibeStatusBadge';
import { coreCmsBlockRegistry, renderCmsBlock, renderCmsPageBlocks } from '@/lib/cms/pages/blockRegistry';
import { createCmsEditorBlock, deleteCmsEditorBlock, duplicateCmsEditorBlock, moveCmsEditorBlock } from '@/lib/cms/pages/editorBlocks';
import { cmsPageDraftSchema, type CmsBlock, type CmsPageDraft } from '@/lib/cms/pages/pageSchema';
import { CmsPageRevisions } from './CmsPageRevisions';

export type CmsPageEditorDocument = { pageId: string; siteId: string; routePath?: string; status: 'draft' | 'published'; currentDraftVersion: number; publishedRevisionId?: string; draftPayload: CmsPageDraft };
type BlockUpdate = (block: CmsBlock) => CmsBlock;

export function CmsPageEditor({ page, pagesHref }: { page: CmsPageEditorDocument; pagesHref: string }) {
  const [draft, setDraft] = useState(() => page.draftPayload);
  const [dirty, setDirty] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [panel, setPanel] = useState<'document' | 'block'>('document');
  const [version, setVersion] = useState(page.currentDraftVersion);
  const [status, setStatus] = useState(page.status);
  const [busy, setBusy] = useState<'save' | 'preview' | 'publish' | null>(null);
  const [notice, setNotice] = useState<{ kind: 'success' | 'error' | 'conflict'; text: string } | null>(null);
  const [preview, setPreview] = useState<CmsPageDraft | null>(null);
  const selected = selectedId ? draft.blocks.find((block) => block.blockId === selectedId) || null : null;
  const changeDraft = (update: (value: CmsPageDraft) => CmsPageDraft) => { setDraft(update); setDirty(true); };
  const changeBlocks = (update: (value: readonly CmsBlock[]) => CmsBlock[]) => changeDraft((value) => ({ ...value, blocks: update(value.blocks) }));
  const changeBlock = (id: string, update: BlockUpdate) => changeBlocks((blocks) => blocks.map((block) => block.blockId === id ? update(block) : block));
  const choose = (id: string) => { setSelectedId(id); setPanel('block'); };
  const insert = (type: string) => { const block = createCmsEditorBlock(type); changeBlocks((blocks) => [...blocks, block]); choose(block.blockId); };
  const remove = (id: string) => { changeBlocks((blocks) => deleteCmsEditorBlock(blocks, id)); if (selectedId === id) { setSelectedId(null); setPanel('document'); } };

  async function saveDraft() {
    const parsed = cmsPageDraftSchema.safeParse(draft);
    if (!parsed.success) { setNotice({ kind: 'error', text: parsed.error.issues[0]?.message || 'Fix invalid fields before saving.' }); return; }
    setBusy('save'); setNotice(null);
    try {
      const response = await fetch(pageApi(page, ''), { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ draft: parsed.data, expectedVersion: version }) });
      const payload = await readPayload(response);
      if (response.status === 409) { setNotice({ kind: 'conflict', text: readError(payload, 'This page changed elsewhere. Reload before continuing.') }); return; }
      if (!response.ok) throw new Error(readError(payload, 'Draft could not be saved.'));
      const nextVersion = readVersion(payload?.page);
      if (nextVersion === null) throw new Error('The save response did not include a draft version.');
      setVersion(nextVersion); setStatus('draft'); setDirty(false); setNotice({ kind: 'success', text: 'Draft saved.' });
    } catch (error) { setNotice({ kind: 'error', text: error instanceof Error ? error.message : 'Draft could not be saved.' }); }
    finally { setBusy(null); }
  }

  async function openPreview() {
    setBusy('preview'); setNotice(null);
    try {
      const response = await fetch(pageApi(page, '/preview'));
      const payload = await readPayload(response);
      if (!response.ok) throw new Error(readError(payload, 'Preview could not be loaded.'));
      const parsed = cmsPageDraftSchema.safeParse(readRecord(payload?.preview)?.draftPayload);
      if (!parsed.success) throw new Error('The preview response is incomplete.');
      setPreview(parsed.data);
    } catch (error) { setNotice({ kind: 'error', text: error instanceof Error ? error.message : 'Preview could not be loaded.' }); }
    finally { setBusy(null); }
  }

  async function publish() {
    setBusy('publish'); setNotice(null);
    try {
      const response = await fetch(pageApi(page, '/publish'), { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ expectedVersion: version }) });
      const payload = await readPayload(response);
      if (response.status === 409) { setNotice({ kind: 'conflict', text: readError(payload, 'This page changed elsewhere. Reload before publishing.') }); return; }
      if (!response.ok) throw new Error(readError(payload, 'Page could not be published.'));
      setStatus('published'); setNotice({ kind: 'success', text: 'Page published.' });
    } catch (error) { setNotice({ kind: 'error', text: error instanceof Error ? error.message : 'Page could not be published.' }); }
    finally { setBusy(null); }
  }

  return <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-900 sm:px-8"><div className="mx-auto max-w-7xl">
    <VibePageHeader eyebrow="Pages" title={draft.title} description={`/${page.routePath || draft.slug}`} backHref={pagesHref} backLabel="All Pages" />
    <div aria-label="Page lifecycle" className="mb-4 flex flex-wrap items-center gap-2 border bg-white p-3"><button type="button" onClick={() => void saveDraft()} disabled={!dirty || busy !== null} className="rounded bg-[#2271b1] px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">{busy === 'save' ? 'Saving…' : 'Save draft'}</button><button type="button" onClick={() => void openPreview()} disabled={dirty || busy !== null} className="rounded border px-4 py-2 text-sm font-semibold disabled:opacity-40">{busy === 'preview' ? 'Loading preview…' : 'Preview'}</button><button type="button" onClick={() => void publish()} disabled={dirty || busy !== null} className="rounded border border-emerald-700 px-4 py-2 text-sm font-semibold text-emerald-800 disabled:opacity-40">{busy === 'publish' ? 'Publishing…' : 'Publish'}</button><span className="ml-auto text-xs text-slate-500">Version {version} · {dirty ? 'Unsaved changes' : status}</span></div>
    {notice ? <p role={notice.kind === 'success' ? 'status' : 'alert'} className={`mb-4 border-l-4 bg-white p-3 text-sm ${notice.kind === 'success' ? 'border-emerald-600' : 'border-red-600 text-red-800'}`}>{notice.text}{notice.kind === 'conflict' ? <button type="button" onClick={() => window.location.reload()} className="ml-3 font-semibold underline">Reload page</button> : null}</p> : null}
    {preview ? <section aria-label="Saved draft preview" className="mb-5 border border-[#2271b1] bg-white p-6"><div className="mb-5 flex justify-between"><div><p className="text-xs font-bold uppercase text-[#2271b1]">Saved draft preview</p><h2 className="text-2xl font-semibold">{preview.title}</h2></div><button type="button" onClick={() => setPreview(null)} className="rounded border px-3 py-2 text-sm">Close preview</button></div><div className="space-y-4">{renderCmsPageBlocks(preview.blocks, { mode: 'preview' })}</div></section> : null}
    <div className="grid gap-5 lg:grid-cols-[220px_minmax(0,1fr)_300px]">
      <aside aria-label="Block inserter" className="h-fit border border-slate-200 bg-white p-4"><h2 className="font-semibold">Blocks</h2><p className="mt-1 text-xs text-slate-500">Add registered content blocks.</p><div className="mt-4 grid gap-2">{coreCmsBlockRegistry.definitions.map((definition) => <button key={definition.type} type="button" onClick={() => insert(definition.type)} className="rounded border border-slate-300 px-3 py-2 text-left text-sm font-semibold hover:border-[#2271b1]">+ {definition.title}</button>)}</div></aside>
      <section aria-label="Page content" className="min-h-[420px] border border-slate-200 bg-white p-6"><div className="flex justify-between"><h2 className="text-lg font-semibold">Page content</h2><span className="text-xs text-slate-500">{draft.blocks.length} block{draft.blocks.length === 1 ? '' : 's'}</span></div>
        {draft.blocks.length === 0 ? <div className="mt-8 border border-dashed border-slate-300 bg-slate-50 p-8 text-center"><p className="text-sm font-semibold">Start building this page</p><p className="mt-1 text-xs text-slate-500">Choose a block from the inserter.</p></div> : <ol className="mt-5 space-y-3">{draft.blocks.map((block, index) => <li key={block.blockId} className={`border p-4 ${selectedId === block.blockId ? 'border-[#2271b1] ring-1 ring-[#2271b1]' : 'border-slate-200'}`}><div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b pb-2"><button type="button" aria-pressed={selectedId === block.blockId} onClick={() => choose(block.blockId)} className="text-xs font-bold uppercase text-slate-500">{coreCmsBlockRegistry.get(block.type)?.title || block.type} · Select</button><div className="flex gap-1"><Control label={`Move ${block.type} up`} disabled={index === 0} onClick={() => changeBlocks((blocks) => moveCmsEditorBlock(blocks, block.blockId, -1))}>↑</Control><Control label={`Move ${block.type} down`} disabled={index === draft.blocks.length - 1} onClick={() => changeBlocks((blocks) => moveCmsEditorBlock(blocks, block.blockId, 1))}>↓</Control><Control label={`Duplicate ${block.type}`} onClick={() => changeBlocks((blocks) => duplicateCmsEditorBlock(blocks, block.blockId))}>Duplicate</Control><Control label={`Delete ${block.type}`} onClick={() => remove(block.blockId)}>Delete</Control></div></div><BlockBody block={block} change={changeBlock} /></li>)}</ol>}
      </section>
      <aside aria-label="Editor settings" className="h-fit border border-slate-200 bg-white"><div role="tablist" aria-label="Editor settings panels" className="grid grid-cols-2 border-b"><Tab active={panel === 'document'} onClick={() => setPanel('document')}>Document</Tab><Tab active={panel === 'block'} disabled={!selected} onClick={() => setPanel('block')}>Block</Tab></div><div className="p-5">{panel === 'block' && selected ? <BlockInspector block={selected} change={changeBlock} /> : <DocumentInspector page={{ ...page, status, currentDraftVersion: version }} draft={draft} change={changeDraft} />}</div><CmsPageRevisions pageId={page.pageId} siteId={page.siteId} version={version} dirty={dirty} onRestore={(restoredDraft, restoredVersion) => { setDraft(restoredDraft); setVersion(restoredVersion); setStatus('draft'); setDirty(false); setPreview(null); setSelectedId(null); setPanel('document'); setNotice({ kind: 'success', text: 'Revision restored as a new draft.' }); }} /></aside>
    </div>
  </div></main>;
}

function BlockBody({ block, change }: { block: CmsBlock; change: (id: string, update: BlockUpdate) => void }) {
  if (block.type === 'core/heading') return <input aria-label="Heading text" maxLength={10_000} value={block.props.text} onChange={(event) => change(block.blockId, (value) => value.type === 'core/heading' ? { ...value, props: { ...value.props, text: event.target.value } } : value)} className="w-full border-0 bg-transparent text-2xl font-semibold" />;
  if (block.type === 'core/paragraph') return <textarea aria-label="Paragraph text" maxLength={50_000} rows={4} value={block.props.text} onChange={(event) => change(block.blockId, (value) => value.type === 'core/paragraph' ? { ...value, props: { ...value.props, text: event.target.value } } : value)} className="w-full resize-y border-0 bg-transparent" />;
  return <div className="pointer-events-none">{renderCmsBlock(block, { mode: 'preview' })}</div>;
}

function DocumentInspector({ page, draft, change }: { page: CmsPageEditorDocument; draft: CmsPageDraft; change: (update: (value: CmsPageDraft) => CmsPageDraft) => void }) {
  return <div role="tabpanel" aria-label="Document settings"><h2 className="font-semibold">Document</h2><div className="mt-4 space-y-4 text-sm"><Field label="Title" value={draft.title} maxLength={200} onChange={(title) => change((value) => ({ ...value, title }))} /><label className="block font-semibold">Excerpt<textarea aria-label="Excerpt" maxLength={500} rows={4} value={draft.excerpt} onChange={(event) => change((value) => ({ ...value, excerpt: event.target.value }))} className="mt-1 w-full rounded border px-3 py-2 font-normal" /></label><dl className="space-y-3"><div><dt>Status</dt><dd><VibeStatusBadge status={page.status} /></dd></div><div><dt>Draft version</dt><dd>{page.currentDraftVersion}</dd></div><div><dt>Template</dt><dd className="font-mono text-xs">{draft.templateId}</dd></div><div><dt>Site ID</dt><dd className="break-all font-mono text-xs">{page.siteId}</dd></div></dl></div></div>;
}

function BlockInspector({ block, change }: { block: CmsBlock; change: (id: string, update: BlockUpdate) => void }) {
  const patch = <T extends CmsBlock['type']>(type: T, props: Record<string, unknown>): BlockUpdate => (value) => value.type === type ? { ...value, props: { ...value.props, ...props } } as CmsBlock : value;
  if (block.type === 'core/heading') return <Panel title="Heading"><label className="block text-sm font-semibold">Level<select aria-label="Level" value={block.props.level} onChange={(e) => change(block.blockId, patch('core/heading', { level: Number(e.target.value) }))} className="mt-1 w-full rounded border px-3 py-2">{[1,2,3,4,5,6].map((n) => <option key={n} value={n}>Heading {n}</option>)}</select></label><Field label="HTML anchor" value={block.props.anchor || ''} onChange={(anchor) => change(block.blockId, patch('core/heading', { anchor: anchor || undefined }))} /></Panel>;
  if (block.type === 'core/image') return <Panel title="Image"><Field label="Image URL" value={block.props.src} onChange={(src) => change(block.blockId, patch('core/image', { src }))} /><Field label="Alternative text" value={block.props.alt} onChange={(alt) => change(block.blockId, patch('core/image', { alt }))} /><Field label="Caption" value={block.props.caption || ''} onChange={(caption) => change(block.blockId, patch('core/image', { caption: caption || undefined }))} /></Panel>;
  if (block.type === 'core/button') return <Panel title="Button"><Field label="Label" value={block.props.label} onChange={(label) => change(block.blockId, patch('core/button', { label }))} /><Field label="Link" value={block.props.href} onChange={(href) => change(block.blockId, patch('core/button', { href }))} /><label className="block text-sm font-semibold">Style<select aria-label="Style" value={block.props.style} onChange={(e) => change(block.blockId, patch('core/button', { style: e.target.value }))} className="mt-1 w-full rounded border px-3 py-2"><option value="primary">Primary</option><option value="secondary">Secondary</option><option value="text">Text</option></select></label></Panel>;
  return <Panel title="Paragraph"><p className="text-sm text-slate-500">Edit this paragraph directly in the canvas.</p></Panel>;
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) { return <div role="tabpanel" aria-label="Block settings" className="space-y-4"><h2 className="font-semibold">{title}</h2>{children}</div>; }
function Field({ label, value, onChange, maxLength }: { label: string; value: string; onChange: (value: string) => void; maxLength?: number }) { return <label className="block text-sm font-semibold">{label}<input aria-label={label} value={value} maxLength={maxLength} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full rounded border px-3 py-2 font-normal" /></label>; }
function Control({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: React.ReactNode }) { return <button type="button" aria-label={label} disabled={disabled} onClick={onClick} className="rounded border px-2 py-1 text-xs disabled:opacity-30">{children}</button>; }
function Tab({ active, onClick, disabled, children }: { active: boolean; onClick: () => void; disabled?: boolean; children: React.ReactNode }) { return <button type="button" role="tab" aria-selected={active} disabled={disabled} onClick={onClick} className={`px-3 py-3 text-sm font-semibold disabled:opacity-40 ${active ? 'border-b-2 border-[#2271b1]' : 'text-slate-500'}`}>{children}</button>; }

type ApiPayload = { error?: unknown; page?: unknown; preview?: unknown; revision?: unknown };
function pageApi(page: CmsPageEditorDocument, suffix: string) { return `/api/vibes/pages/${encodeURIComponent(page.pageId)}${suffix}?siteId=${encodeURIComponent(page.siteId)}`; }
async function readPayload(response: Response): Promise<ApiPayload | null> { const text = await response.text(); if (!text.trim()) return null; try { const value: unknown = JSON.parse(text); return value && typeof value === 'object' ? value as ApiPayload : null; } catch { return null; } }
function readRecord(value: unknown) { return value && typeof value === 'object' ? value as Record<string, unknown> : null; }
function readError(payload: ApiPayload | null, fallback: string) { return typeof payload?.error === 'string' && payload.error.trim() ? payload.error : fallback; }
function readVersion(value: unknown) { const next = readRecord(value)?.currentDraftVersion; return typeof next === 'number' && Number.isInteger(next) && next >= 0 ? next : null; }
