'use client';

import React, { Component, lazy, Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Compass, Globe2, X } from 'lucide-react';

const CinematicHero = lazy(() => import('@/components/CinematicHero'));

class ExperienceErrorBoundary extends Component<React.PropsWithChildren, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-3xl border border-white/10 bg-[#07131a] p-8 text-center text-white" role="alert">
          <p className="text-lg font-bold">The Atlas view could not open.</p>
          <p className="mt-2 text-sm text-slate-300">You can still browse listings and explore the map.</p>
          <Link className="mt-4 inline-flex min-h-11 items-center gap-2 text-teal-200 underline" href="/atlas">Open Atlas <ArrowRight size={16} /></Link>
        </div>
      );
    }
    return this.props.children;
  }
}

export function HomeHero() {
  const [open, setOpen] = useState(false);
  const launchRef = useRef<HTMLButtonElement>(null);
  const wasOpen = useRef(false);

  useEffect(() => {
    if (wasOpen.current && !open) launchRef.current?.focus();
    wasOpen.current = open;
  }, [open]);

  return (
    <section className="bg-[#061017] px-4 py-8 text-white sm:px-6 sm:py-12" aria-labelledby="home-explore-title">
      <div className="mx-auto max-w-7xl">
        {open ? (
          <div className="relative overflow-hidden rounded-3xl border border-white/10">
            <button type="button" onClick={() => setOpen(false)} className="absolute right-4 top-4 z-[60] inline-flex min-h-11 items-center gap-2 rounded-full border border-white/20 bg-black/70 px-4 text-sm font-bold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-200" aria-label="Close Atlas experience">
              <X size={16} /> Close
            </button>
            <ExperienceErrorBoundary>
              <Suspense fallback={<div role="status" className="flex min-h-[420px] items-center justify-center bg-[#061017] text-sm text-teal-100">Opening Atlas experience…</div>}>
                <CinematicHero />
              </Suspense>
            </ExperienceErrorBoundary>
          </div>
        ) : (
          <div className="grid gap-6 rounded-3xl border border-cyan-100/10 bg-[radial-gradient(circle_at_85%_30%,rgba(45,212,191,0.14),transparent_34%),linear-gradient(135deg,#0a2029,#07131a)] p-6 sm:p-9 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-teal-200">Sunset Pulse Atlas</p>
              <h2 id="home-explore-title" className="mt-3 max-w-3xl text-3xl font-black italic uppercase leading-tight sm:text-4xl">Explore North Texas Your Way</h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">Browse homes, open the map, or take a look around the interactive Atlas.</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
              <button ref={launchRef} type="button" onClick={() => setOpen(true)} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-teal-300 px-5 py-3 text-sm font-black text-slate-950 transition hover:bg-teal-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">
                <Globe2 size={18} /> Open Atlas View
              </button>
              <Link href="/explorer" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-200">
                <Compass size={18} /> Open Explorer
              </Link>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

export function HomeWorldHub() {
  return null;
}
