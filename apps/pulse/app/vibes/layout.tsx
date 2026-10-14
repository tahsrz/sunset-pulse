import Link from 'next/link';
import React from 'react';
import { VibeSidebar } from './VibeSidebar';
import fieldbook from '@/components/realtor/Fieldbook.module.css';

export default function VibeLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className={fieldbook.surface} data-fieldbook="publishing">
      <a href="#vibe-workspace" className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded focus:bg-white focus:px-3 focus:py-2 focus:text-sm focus:font-semibold focus:text-slate-900">Skip to Vibe workspace</a>
      <header className={fieldbook.masthead + ' px-5 pt-5'}>
        <div className={fieldbook.brand}>Sunset Pulse<small>FIELDBOOK</small></div>
        <nav aria-label="Vibes utility" className="flex w-full items-center justify-between">
          <Link href="/vibes" className="py-3 text-sm">Publishing</Link>
          <Link href="/vibes/new" className="py-3 text-sm">New draft</Link>
        </nav>
      </header>
      <div className="min-h-[calc(100vh-2.5rem)] lg:flex">
        <VibeSidebar />
        <main id="vibe-workspace" className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
