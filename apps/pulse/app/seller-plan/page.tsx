import { FieldbookShell } from '@/components/realtor/FieldbookShell';
import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import SellerPlanRequestForm from '@/components/lead-capture/SellerPlanRequestForm';
import { SellerOfferMeasurement } from '@/components/lead-capture/SellerOfferMeasurement';
import { SellerPlanSample, PricingReviewCard } from '@/components/marketing/SellerPlanSample';
import { getPublishedSellerExample } from '@/lib/marketing/sellerExamples.server';
import { getPublishedSellerIntroduction } from '@/lib/marketing/sellerIntroduction.server';
import { sellerCampaignQuery, type SellerCampaignSearchParams } from '@/lib/marketing/sellerCampaignQuery';
import { isSellerGuidedIntakeEnabled } from '@/lib/marketing/sellerGuidedIntake.server';

export const metadata: Metadata = {
  title: 'Free Home and Land Seller Plan | Sunset Pulse',
  description: 'Start a conversation about selling your home or land near Sunset, Texas. Ask about what to do first or request a pricing review.',
  alternates: { canonical: '/seller-plan' },
};

export default async function SellerPlanPage({ searchParams }: { searchParams: Promise<SellerCampaignSearchParams & { requestKind?: string }> }) {
  const params = await searchParams;
  const initialRequestKind = params.requestKind === 'pricing_review' ? 'pricing_review' : 'seller_plan';
  const campaignQuery = sellerCampaignQuery(params);
  const guidedQuery = new URLSearchParams(campaignQuery);
  if (initialRequestKind === 'pricing_review') guidedQuery.set('requestKind', initialRequestKind);
  const guidedHref = `/seller-plan/start${guidedQuery.size ? `?${guidedQuery}` : ''}`;
  const example = getPublishedSellerExample();
  const phone = getPublishedSellerIntroduction()?.phone;
  return (
    <FieldbookShell title="Your Seller Plan" eyebrow="Homes and Land">
      <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[minmax(360px,1fr)_minmax(0,0.85fr)] lg:items-start">
        <section id="request" aria-labelledby="seller-plan-form-title" className="fieldbook-panel scroll-mt-24">
          <h2 id="seller-plan-form-title" className="italic">Request a Conversation</h2>
          <p className="mb-5 mt-2 text-base leading-relaxed text-slate-300">It’s fine to be unsure about selling. Leave your name and email so we can follow up. You can tell us about the property when we talk.</p>
          {phone ? <a href={`tel:${phone.replace(/[^+\d]/g, '')}`} className="mb-4 inline-flex min-h-11 items-center text-base font-semibold underline">Call About Selling</a> : null}
          <SellerPlanRequestForm key={initialRequestKind} initialRequestKind={initialRequestKind} />
          <SellerOfferMeasurement />
          {isSellerGuidedIntakeEnabled() ? <div className="mt-6">
            {/* Use document navigation so the root layout can switch to the focused form. */}
            <a className="inline-flex min-h-11 items-center font-semibold underline" href={guidedHref}>Start Guided Seller Plan</a>
          </div> : null}
        </section>
        <section className="max-w-3xl">
          <h2 className="mt-1 italic">What We Can Talk Through</h2>
          <p className="mt-4 text-base leading-7 text-slate-300">Start with what’s on the land. A home and a few outbuildings can raise different questions than a house on its own. We can talk about what to prepare and how the buildings fit into the sale.</p>
          <p className="mt-4 text-sm leading-6 text-slate-400">This request is not an instant valuation or appraisal. Any price discussion depends on current, verified property information and relevant comparable sales.</p>
          <div className="mt-6"><PricingReviewCard campaignQuery={campaignQuery} /></div>
          {example ? <div className="mt-7"><SellerPlanSample sampleLabel={example.sampleLabel} tasks={example.tasks} /></div> : null}
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/neighborhoods" className="inline-flex min-h-11 items-center rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-cyan-100 hover:bg-white/5">Explore Local Guides</Link>
            <Link href="/iabs" className="inline-flex min-h-11 items-center rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-cyan-100 hover:bg-white/5">Brokerage Services Information</Link>
          </div>
        </section>
      </div>
    </FieldbookShell>
  );
}
