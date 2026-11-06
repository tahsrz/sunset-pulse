import React from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import GuidedBuyerRequestForm from '@/components/lead-capture/journey/GuidedBuyerRequestForm';
import { getGuidedBuyerIntakeSite } from '@/lib/marketing/buyerGuidedIntake.server';
import { readSellerCampaign, type SellerCampaignSearchParams } from '@/lib/marketing/sellerCampaignQuery';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Find a Home | Sunset Pulse', robots: { index: false, follow: false } };

export default async function BuyerPlanStartPage({ searchParams }: { searchParams: Promise<SellerCampaignSearchParams> }) {
  if (!getGuidedBuyerIntakeSite()) notFound();
  return <GuidedBuyerRequestForm campaign={readSellerCampaign(await searchParams)} />;
}
