'use client';

import React from 'react';
import type { HomepageSectionBlock } from '@/lib/cms/pages/homepageSectionSchema';

export function HomepageSectionFields({ block, change }: { block: HomepageSectionBlock; change: (block: HomepageSectionBlock) => void }) {
  const props = block.props;
  const patch = (update: Partial<typeof props>) => change({ ...block, props: { ...props, ...update } });
  return <div className="space-y-4 text-sm">
    <label className="block">Section layout<select value={props.layout} onChange={(event) => patch({ layout: event.target.value as typeof props.layout })} className="mt-1 w-full border py-2 pl-2 pr-8">
      <option value="hero">Hero</option><option value="destinations">Destination cards</option><option value="story">Story</option><option value="faq">Questions and answers</option><option value="closing">Closing action</option>
    </select></label>
    {(['eyebrow', 'heading', 'text', 'actionLabel', 'actionHref'] as const).map((field) => <label key={field} className="block">
      {{ eyebrow: 'Eyebrow', heading: 'Section heading', text: 'Section text', actionLabel: 'Action text', actionHref: 'Action link' }[field]}
      <textarea rows={field === 'text' ? 4 : 1} value={props[field]} className="mt-1 w-full border p-2" onChange={(event) => patch({ [field]: event.target.value })} />
    </label>)}
    {props.items.map((item, index) => <fieldset key={index} className="space-y-3 border p-3"><legend>Item {index + 1}</legend>
      {(['title', 'text', 'linkLabel', 'href'] as const).map((field) => <label key={field} className="block">
        {{ title: 'Title or question', text: 'Text or answer', linkLabel: 'Link text', href: 'Link destination' }[field]}
        <textarea rows={field === 'text' ? 3 : 1} value={item[field]} className="mt-1 w-full border p-2" onChange={(event) => patch({ items: props.items.map((value, itemIndex) => itemIndex === index ? { ...value, [field]: event.target.value } : value) })} />
      </label>)}
      <button type="button" onClick={() => patch({ items: props.items.filter((_, itemIndex) => itemIndex !== index) })} className="text-red-700 underline">Remove item {index + 1}</button>
    </fieldset>)}
    <button type="button" disabled={props.items.length >= 12} onClick={() => patch({ items: [...props.items, { title: '', text: '', linkLabel: '', href: '' }] })} className="border px-3 py-2 disabled:opacity-40">Add item</button>
  </div>;
}
