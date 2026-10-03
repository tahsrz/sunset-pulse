import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Property Pricing Review | Sunset Pulse',
  description: 'Request a personal, evidence-led seller pricing conversation for a Keller or Westlake home.',
  alternates: { canonical: '/valuation' },
};

export default function ValuationPage() {
  return (
    <main className="min-h-screen bg-[#061017] px-4 py-16 text-white sm:px-6 sm:py-24">
      <div className="mx-auto max-w-4xl">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-teal-200">Pricing review · Keller and Westlake</p>
        <h1 className="mt-4 text-4xl font-black leading-tight sm:text-5xl">A useful pricing conversation starts with evidence.</h1>
        <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-300">Sunset Pulse does not currently provide an automated property estimate. A comparative market analysis needs current, relevant comparable sales, property-specific details and a licensed professional’s review.</p>
        <p className="mt-4 max-w-3xl leading-7 text-slate-400">No price, range or turnaround promise is generated here. If you are considering a sale, you can request a personal conversation; sharing the home address is optional in the initial request.</p>
        <div className="mt-9 flex flex-wrap gap-4">
          <Link className="rounded-full bg-teal-500 px-6 py-3 font-bold text-slate-950 hover:bg-teal-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white" href="/seller-plan">Request a seller pricing conversation</Link>
          <Link className="rounded-full border border-white/15 px-6 py-3 font-semibold text-teal-100 hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-200" href="/keller-westlake/market-report">View the local market report status</Link>
          <Link className="rounded-full border border-white/15 px-6 py-3 font-semibold text-slate-200 hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-200" href="/neighborhoods">Explore neighborhood guides</Link>
        </div>
      </div>
    </main>
  );
}
