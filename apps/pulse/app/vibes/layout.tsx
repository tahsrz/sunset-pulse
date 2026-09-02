import Link from 'next/link';
import React from 'react';
import { VibeSidebar } from './VibeSidebar';

export default function VibeLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="min-h-screen bg-[#f0f0f1] font-sans text-[#1d2327]">
      <a href="#vibe-workspace" className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded focus:bg-white focus:px-3 focus:py-2 focus:text-sm focus:font-semibold focus:text-slate-900">Skip to Vibe workspace</a>
      <header className="sticky top-0 z-20 flex h-10 items-center justify-between bg-[#1d2327] px-3 text-sm text-[#f0f0f1] shadow-sm">
        <nav aria-label="Vibes utility" className="flex w-full items-center justify-between">
          <Link href="/vibes" className="rounded font-semibold hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#1d2327]">Vibe CMS</Link>
          <Link href="/vibes/new" className="rounded bg-[#2271b1] px-2.5 py-1 text-xs font-semibold text-white hover:bg-[#135e96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#1d2327]">+ Add New</Link>
        </nav>
      </header>
      <div className="min-h-[calc(100vh-2.5rem)] lg:flex">
        <VibeSidebar />
        <main id="vibe-workspace" className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
