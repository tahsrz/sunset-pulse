import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { listPublishedNeighborhoodGuides } from '@/lib/marketing/neighborhoodGuides.server';

export const metadata: Metadata = {
  title: 'Keller and Westlake Neighborhood Guides | Sunset Pulse',
  description: 'Source-linked Keller and Westlake home research guides, with address-level questions clearly marked for verification.',
  alternates: { canonical: '/neighborhoods' },
};

export default function NeighborhoodGuidesPage() {
  const guides = listPublishedNeighborhoodGuides();
  return (
    <main className="min-h-screen bg-[#061017] px-4 py-14 text-white sm:px-6 sm:py-20">
      <div className="mx-auto max-w-6xl">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-teal-200">Keller · Westlake · North Texas</p>
        <h1 className="mt-4 max-w-4xl text-4xl font-black leading-tight sm:text-5xl">Local guides, with the facts and the unknowns separated.</h1>
        <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-300">Start with cited city and district sources. School assignment, HOA terms and commute depend on the exact property and current documents, so we mark them for verification instead of guessing.</p>
        <ul className="mt-10 grid gap-5 md:grid-cols-3">
          {guides.map((guide) => (
            <li key={guide.slug} className="flex flex-col rounded-3xl border border-white/10 bg-white/[0.05] p-6">
              <p className="text-xs font-bold uppercase tracking-widest text-teal-200">{guide.coverageType} guide · reviewed {guide.reviewedAt}</p>
              <h2 className="mt-3 text-2xl font-bold">{guide.title}</h2>
              <p className="mt-3 flex-1 leading-7 text-slate-300">{guide.summary}</p>
              <Link className="mt-6 inline-flex min-h-11 items-center text-sm font-bold text-teal-200 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-200" href={`/neighborhoods/${guide.slug}`}>Read guide <span aria-hidden="true" className="ml-2">→</span></Link>
            </li>
          ))}
        </ul>
        <p className="mt-10 text-sm text-slate-400">Want a plan for selling a home in the area? <Link className="font-bold text-teal-200 underline underline-offset-4" href="/seller-plan">Request a personal seller plan</Link>.</p>
      </div>
    </main>
  );
}
