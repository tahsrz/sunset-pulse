'use client';

import React from 'react';
import SellerConsultationPicker from '@/components/lead-capture/SellerConsultationPicker';
import type { SellerPlanLeadInput } from '@/lib/marketing/leadMagnetContract';
import { sellerBookingOfferSchema } from '@/lib/scheduling/sellerConsultationContract';
import GuidedJourneyPrototype from './GuidedJourneyPrototype';
import type { SellerJourneyTransport } from './useSellerJourneySubmission';
import styles from './GuidedJourney.module.css';

const sendSellerRequest: SellerJourneyTransport = async (request, { signal }) => {
  const response = await fetch('/api/lead-magnets', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, cache: 'no-store',
    signal, body: JSON.stringify(request),
  });
  return { ok: response.ok, body: await response.json() as unknown };
};

function parseBookingOffer(value: unknown) {
  const parsed = sellerBookingOfferSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

export default function GuidedSellerRequestForm({ campaign, pricingReview }: { campaign?: SellerPlanLeadInput['campaign']; pricingReview?: boolean }) {
  return <GuidedJourneyPrototype live={{
    campaign, pricingReview, transport: sendSellerRequest, parseBookingOffer,
    renderBooking: (offer) => <div className={styles.booking}><SellerConsultationPicker offer={offer} /></div>,
  }} />;
}
