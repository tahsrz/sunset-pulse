import Link from 'next/link';
import React, { type ReactNode } from 'react';

type VibePageHeaderProps = {
  title: string;
  description?: ReactNode;
  eyebrow?: string;
  backHref?: string;
  backLabel?: string;
  actions?: ReactNode;
};

export function VibePageHeader({ title, description, eyebrow, backHref, backLabel, actions }: VibePageHeaderProps) {
  return (
    <header className="mb-5">
      {backHref && backLabel ? <Link href={backHref} className="text-sm font-semibold text-slate-500 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2271b1] focus-visible:ring-offset-2">← {backLabel}</Link> : null}
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <div>
          {eyebrow ? <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">{eyebrow}</p> : null}
          <h1 className="text-3xl font-black tracking-tight text-slate-900">{title}</h1>
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
      {description ? <div className="mt-1 text-sm text-slate-600">{description}</div> : null}
    </header>
  );
}
