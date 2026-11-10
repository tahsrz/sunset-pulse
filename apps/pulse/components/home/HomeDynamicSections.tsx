'use client';

import React, { Component, lazy, Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Compass, Globe2, X } from 'lucide-react';
import { loadAtlasExperience } from '@/lib/home/loadAtlasExperience';

import styles from '@/app/home.module.css';

class ExperienceErrorBoundary extends Component<React.PropsWithChildren<{ onRetry: () => void }>, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded border border-white/15 bg-[#121923] p-8 text-center text-white" role="alert">
          <p className="text-lg font-bold">The Atlas view could not open.</p>
          <p className="mt-2 text-sm text-slate-300">You can still browse listings and explore the map.</p>
          <button type="button" onClick={this.props.onRetry} className="mt-4 mr-4 inline-flex min-h-11 items-center rounded-lg border border-teal-200 px-4 text-sm font-bold text-teal-100">Retry Atlas View</button>
          <Link className="mt-4 inline-flex min-h-11 items-center gap-2 text-teal-200 underline" href="/atlas">Open Atlas <ArrowRight size={16} /></Link>
        </div>
      );
    }
    return this.props.children;
  }
}

export function HomeHero() {
  const [open, setOpen] = useState(false);
  const [experience, setExperience] = useState(() => ({ attempt: 0, Component: lazy(loadAtlasExperience) }));
  const CinematicHero = experience.Component;
  const launch = () => {
    setExperience(previous => ({ attempt: previous.attempt + 1, Component: lazy(loadAtlasExperience) }));
    setOpen(true);
  };
  const launchRef = useRef<HTMLButtonElement>(null);
  const wasOpen = useRef(false);

  useEffect(() => {
    if (wasOpen.current && !open) launchRef.current?.focus();
    wasOpen.current = open;
  }, [open]);

  return (
    <section className={styles.section} aria-label="Sunset Pulse Atlas">
      <div className={styles.frame}>
        {open ? (
          <div className={`relative overflow-hidden ${styles.panel}`}>
            <button type="button" onClick={() => setOpen(false)} className="absolute left-4 top-4 z-[60] inline-flex min-h-11 items-center gap-2 rounded border border-white/20 bg-black/70 px-4 text-sm font-bold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-200" aria-label="Close Atlas experience">
              <X size={16} /> Close
            </button>
            <ExperienceErrorBoundary key={experience.attempt} onRetry={launch}>
              <Suspense fallback={<div role="status" className="flex min-h-[420px] items-center justify-center bg-[#121923] text-sm text-slate-200">Opening Atlas experience…</div>}>
                <CinematicHero />
              </Suspense>
            </ExperienceErrorBoundary>
          </div>
        ) : (
          <div className={`${styles.panel} grid gap-6 p-5 sm:p-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center`}>
            <div>
              <p className={styles.label}>Sunset Pulse Atlas</p>
              <h2 id="home-explore-title" className="mt-3 max-w-3xl text-3xl leading-tight sm:text-4xl">Explore North Texas Your Way</h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">Browse homes, open the map, or take a look around the interactive Atlas.</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
              <button ref={launchRef} type="button" onClick={launch} className={`${styles.action} ${styles.primary}`}>
                <Globe2 size={18} /> Open Atlas View
              </button>
              <Link href="/explorer" className={styles.action}>
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
