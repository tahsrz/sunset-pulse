import React from 'react';
import Link from 'next/link';
import { ArrowRight, MapPinned } from 'lucide-react';

export default function SellerAcquisitionHero() {
  return (
    <section aria-labelledby="seller-acquisition-title" className="relative z-20 border-b border-cyan-100/10 bg-[#07131a] px-4 py-5 text-white sm:px-6 sm:py-7">
      <div className="mx-auto grid max-w-7xl gap-5 rounded-3xl border border-cyan-100/15 bg-[radial-gradient(circle_at_12%_20%,rgba(45,212,191,0.13),transparent_38%),rgba(255,255,255,0.045)] p-5 shadow-2xl shadow-black/20 sm:p-7 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <div className="min-w-0">
          <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-amber-200/25 bg-amber-200/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-amber-100">
            <MapPinned aria-hidden="true" size={13} /> Keller · Westlake · North Texas
          </p>
          <h1 id="seller-acquisition-title" className="max-w-3xl text-2xl font-black leading-tight tracking-tight sm:text-3xl lg:text-4xl">
            Sell your home with a clear plan.
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300 sm:text-base">
            Personal pricing review, preparation priorities, buyer-facing marketing, showings and offer guidance—from your first conversation through closing.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row lg:min-w-[390px] lg:flex-col">
          <Link href="/seller-plan#request" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-teal-400 px-5 py-3 text-sm font-black text-slate-950 transition hover:bg-teal-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950">
            Request my free seller plan <ArrowRight aria-hidden="true" size={17} />
          </Link>
          <Link href="/neighborhoods" className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-cyan-100/20 bg-cyan-100/[0.07] px-5 py-3 text-sm font-bold text-cyan-50 transition hover:bg-cyan-100/[0.13] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200">
            Read the Keller / Westlake guides
          </Link>
        </div>
      </div>
    </section>
  );
}
