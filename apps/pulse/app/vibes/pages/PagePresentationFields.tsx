'use client';

import React from 'react';
import type { CmsPageDraft } from '@/lib/cms/pages/pageSchema';

export function PagePresentationFields({ draft, change }: {
  draft: CmsPageDraft; change: (update: (value: CmsPageDraft) => CmsPageDraft) => void;
}) {
  const presentation = draft.presentation;
  return <div className="space-y-4 border-t p-5 text-sm">
    <h2 className="font-semibold">Header and footer</h2>
    <p className="text-xs text-slate-600">Overrides apply to this page only. Other pages keep their site defaults.</p>
    <label className="flex gap-2"><input type="checkbox" checked={!!presentation} onChange={(event) => change((value) => ({
      ...value, presentation: event.target.checked ? { siteName: value.title, homeLabel: 'Home', navigationLabel: 'Site navigation', footerText: value.title } : undefined,
    }))} />Customize this page</label>
    {presentation ? (Object.keys(presentation) as Array<keyof typeof presentation>).map((key) => <label key={key} className="block">
      {{ siteName: 'Site title', homeLabel: 'Home link text', navigationLabel: 'Navigation accessible label', footerText: 'Footer text' }[key]}
      <textarea rows={key === 'footerText' ? 3 : 1} maxLength={key === 'footerText' ? 2000 : key === 'siteName' ? 200 : 100} value={presentation[key]} className="mt-1 w-full border p-2"
        onChange={(event) => change((value) => ({ ...value, presentation: { ...presentation, [key]: event.target.value } }))} />
    </label>) : null}
    <h2 className="font-semibold">Search appearance</h2>
    <p className="text-xs text-slate-600">Leave blank to use the page title and excerpt. Search metadata is not visible page text.</p>
    <label className="block">SEO title<input maxLength={200} value={draft.seo?.title || ''} className="mt-1 w-full border p-2" onChange={(event) => change((value) => ({ ...value, seo: { title: event.target.value, description: value.seo?.description || '' } }))} /></label>
    <label className="block">SEO description<textarea maxLength={500} value={draft.seo?.description || ''} className="mt-1 w-full border p-2" onChange={(event) => change((value) => ({ ...value, seo: { title: value.seo?.title || '', description: event.target.value } }))} /></label>
  </div>;
}
