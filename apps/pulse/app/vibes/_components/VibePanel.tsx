'use client';

import type { ReactNode } from 'react';
import { useState } from 'react';

type VibePanelProps = { id: string; title: string; description?: ReactNode; defaultOpen?: boolean; children: ReactNode };

export function VibePanel({ id, title, description, defaultOpen = true, children }: VibePanelProps) {
  const [open, setOpen] = useState(defaultOpen);
  const regionId = `${id}-content`;
  return <section className="rounded border border-slate-200 bg-white">
    <h2 className="text-base font-semibold text-slate-900">
      <button type="button" aria-expanded={open} aria-controls={regionId} onClick={() => setOpen((current) => !current)} className="flex w-full items-center justify-between px-4 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2271b1] focus-visible:ring-inset">
        <span>{title}</span><span aria-hidden="true" className="text-slate-500">{open ? '−' : '+'}</span>
      </button>
    </h2>
    <div id={regionId} hidden={!open} className="border-t border-slate-200 px-4 py-4">
      {description ? <p className="mb-3 text-sm text-slate-600">{description}</p> : null}
      {children}
    </div>
  </section>;
}
