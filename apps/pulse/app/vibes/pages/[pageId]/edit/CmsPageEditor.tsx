'use client';

import React, { useState } from 'react';
import { VibePageHeader } from '../../../_components/VibePageHeader';
import { VibeStatusBadge } from '../../../_components/VibeStatusBadge';
import { coreCmsBlockRegistry, renderCmsBlock } from '@/lib/cms/pages/blockRegistry';
import { createCmsEditorBlock, deleteCmsEditorBlock, duplicateCmsEditorBlock, moveCmsEditorBlock } from '@/lib/cms/pages/editorBlocks';
import type { CmsBlock, CmsPageDraft } from '@/lib/cms/pages/pageSchema';

export type CmsPageEditorDocument = {
  pageId: string;
  siteId: string;
  routePath?: string;
  status: 'draft' | 'published';
  currentDraftVersion: number;
  publishedRevisionId?: string;
  draftPayload: CmsPageDraft;
};

export function CmsPageEditor({ page, pagesHref }: { page: CmsPageEditorDocument; pagesHref: string }) {
  const [draft, setDraft] = useState(() => page.draftPayload);
  const [dirty, setDirty] = useState(false);

  function updateBlocks(update: (blocks: readonly CmsBlock[]) => CmsBlock[]) {
    setDraft((current) => ({ ...current, blocks: update(current.blocks) }));
    setDirty(true);
  }

  function insertBlock(type: string) {
    updateBlocks((blocks) => [...blocks, createCmsEditorBlock(type)]);
  }

  return <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-900 sm:px-8"><div className="mx-auto max-w-7xl">
    <VibePageHeader eyebrow="Pages" title={draft.title} description={`/${page.routePath || draft.slug}`} backHref={pagesHref} backLabel="All Pages" />
    {dirty ? <p role="status" className="mb-4 border-l-4 border-amber-500 bg-white p-3 text-sm">You have local changes. Draft saving is added in the lifecycle-toolbar slice.</p> : null}
    <div className="grid gap-5 lg:grid-cols-[220px_minmax(0,1fr)_300px]">
      <aside aria-label="Block inserter" className="h-fit border border-slate-200 bg-white p-4">
        <h2 className="font-semibold">Blocks</h2>
        <p className="mt-1 text-xs text-slate-500">Add registered content blocks.</p>
        <div className="mt-4 grid gap-2">{coreCmsBlockRegistry.definitions.map((definition) => <button key={definition.type} type="button" onClick={() => insertBlock(definition.type)} className="rounded border border-slate-300 px-3 py-2 text-left text-sm font-semibold hover:border-[#2271b1] hover:text-[#2271b1]">+ {definition.title}</button>)}</div>
      </aside>
      <section aria-label="Page content" className="min-h-[420px] border border-slate-200 bg-white p-6">
        <div className="flex items-center justify-between gap-3"><h2 className="text-lg font-semibold">Page content</h2><span className="text-xs text-slate-500">{draft.blocks.length} block{draft.blocks.length === 1 ? '' : 's'}</span></div>
        {draft.blocks.length === 0 ? <div className="mt-8 border border-dashed border-slate-300 bg-slate-50 p-8 text-center"><p className="text-sm font-semibold">Start building this page</p><p className="mt-1 text-xs text-slate-500">Choose a block from the inserter.</p></div> : <ol className="mt-5 space-y-3">{draft.blocks.map((block, index) => <li key={block.blockId} className="group border border-slate-200 p-4 focus-within:border-[#2271b1]">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2"><span className="text-xs font-bold uppercase tracking-wide text-slate-500">{coreCmsBlockRegistry.get(block.type)?.title || block.type}</span><div className="flex gap-1"><button type="button" disabled={index === 0} onClick={() => updateBlocks((blocks) => moveCmsEditorBlock(blocks, block.blockId, -1))} aria-label={`Move ${block.type} up`} className="rounded border px-2 py-1 text-xs disabled:opacity-30">↑</button><button type="button" disabled={index === draft.blocks.length - 1} onClick={() => updateBlocks((blocks) => moveCmsEditorBlock(blocks, block.blockId, 1))} aria-label={`Move ${block.type} down`} className="rounded border px-2 py-1 text-xs disabled:opacity-30">↓</button><button type="button" onClick={() => updateBlocks((blocks) => duplicateCmsEditorBlock(blocks, block.blockId))} aria-label={`Duplicate ${block.type}`} className="rounded border px-2 py-1 text-xs">Duplicate</button><button type="button" onClick={() => updateBlocks((blocks) => deleteCmsEditorBlock(blocks, block.blockId))} aria-label={`Delete ${block.type}`} className="rounded border border-red-200 px-2 py-1 text-xs text-red-700">Delete</button></div></div>
          <div className="pointer-events-none">{renderCmsBlock(block, { mode: 'preview' })}</div>
        </li>)}</ol>}
      </section>
      <aside aria-label="Document summary" className="h-fit border border-slate-200 bg-white p-5">
        <h2 className="font-semibold">Document</h2>
        <dl className="mt-4 space-y-4 text-sm"><div><dt className="text-slate-500">Status</dt><dd className="mt-1"><VibeStatusBadge status={page.status} /></dd></div><div><dt className="text-slate-500">Draft version</dt><dd className="mt-1 font-semibold">{page.currentDraftVersion}</dd></div><div><dt className="text-slate-500">Template</dt><dd className="mt-1 font-mono text-xs">{draft.templateId}</dd></div><div><dt className="text-slate-500">Site ID</dt><dd className="mt-1 break-all font-mono text-xs">{page.siteId}</dd></div></dl>
      </aside>
    </div>
  </div></main>;
}
