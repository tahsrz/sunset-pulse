import { FieldbookShell } from '@/components/realtor/FieldbookShell';
import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import SellerPlanRequestForm from '@/components/lead-capture/SellerPlanRequestForm';
import { SellerOfferMeasurement } from '@/components/lead-capture/SellerOfferMeasurement';

export const metadata: Metadata = {
  title: 'Free Keller and Westlake Seller Plan | Sunset Pulse',
  description: 'Request a personal home pricing review and preparation plan for a Keller or Westlake sale.',
  alternates: { canonical: '/seller-plan' },
};

export default function SellerPlanPage() {
  return (
    <FieldbookShell title="Seller plan" eyebrow="Keller · Westlake">
      <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(360px,0.85fr)] lg:items-start">
        <section className="max-w-3xl">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-teal-200">Keller · Westlake · seller representation</p>
          <h2 className="mt-4">Seller consultation</h2>
          <p className="mt-5 text-lg leading-8 text-slate-300">Talk through your timing, preparation and pricing questions with a real estate professional. If comparable-sale data is available and authorized, the next step can be a personally reviewed comparative market analysis.</p>
          <p className="mt-4 text-sm leading-6 text-slate-400">This request is not an instant valuation or appraisal. Any price discussion depends on current, verified property information and relevant comparable sales.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/neighborhoods" className="rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-cyan-100 hover:bg-white/5">Explore local guides</Link>
            <Link href="/iabs" className="rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-cyan-100 hover:bg-white/5">Brokerage services information</Link>
          </div>
          <section aria-labelledby="seller-checklist-title" className="fieldbook-panel mt-10">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-200">Useful before you list</p>
            <h2 id="seller-checklist-title" className="mt-2 text-2xl font-bold">Preparation checklist</h2>
            <ol className="mt-5 space-y-4 text-sm leading-6 text-slate-300">
              <li><span className="font-bold text-white">1. Gather what you already have.</span> Note major updates, receipts, warranties and any property documents you can readily find.</li>
              <li><span className="font-bold text-white">2. Write down your timing.</span> Include your preferred move date, flexibility and any events that affect showings.</li>
              <li><span className="font-bold text-white">3. Make a “fix / disclose / ask” list.</span> Flag known issues and questions; do not conceal a condition or start work based on an online checklist alone.</li>
              <li><span className="font-bold text-white">4. Plan for the first walk-through.</span> Identify rooms, storage and outdoor areas you would like to discuss for preparation and photography.</li>
              <li><span className="font-bold text-white">5. Review a pricing conversation with real evidence.</span> Comparable sales, property condition and current data should be checked before discussing a suggested list price.</li>
            </ol>
          </section>
        </section>
        <section aria-labelledby="seller-plan-form-title" className="fieldbook-panel">
          <h2 id="seller-plan-form-title" className="text-2xl font-bold">Request a seller plan</h2>
          <p className="mb-6 mt-2 text-sm leading-6 text-slate-300">Start with the kind of help you need. For your privacy, this public form does not collect a street address.</p>
          <SellerPlanRequestForm />
          <SellerOfferMeasurement />
        </section>
      </div>
    </FieldbookShell>
  );
}
