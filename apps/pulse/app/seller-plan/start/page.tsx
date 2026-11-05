import React from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import GuidedSellerRequestForm from '@/components/lead-capture/journey/GuidedSellerRequestForm';
import { readSellerCampaign, type SellerCampaignSearchParams } from '@/lib/marketing/sellerCampaignQuery';
import { isSellerGuidedIntakeEnabled } from '@/lib/marketing/sellerGuidedIntake.server';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Start Your Seller Plan | Sunset Pulse', robots: { index: false, follow: false } };

export default async function SellerPlanStartPage({ searchParams }: { searchParams: Promise<SellerCampaignSearchParams> }) {
  if (!isSellerGuidedIntakeEnabled()) notFound();
  const params = await searchParams;
  return <GuidedSellerRequestForm campaign={readSellerCampaign(params)} pricingReview={params.requestKind === 'pricing_review'} />;
}
