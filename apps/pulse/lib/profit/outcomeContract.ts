import { z } from 'zod';

export const BILLABLE_OUTCOME_TYPES = [
  'qualified_handoff',
  'property_specific_handoff',
  'buyer_consultation_booked',
  'property_tour_booked',
  'seller_consultation_booked',
] as const;

export const OUTCOME_DISQUALIFIERS = [
  'failed_delivery',
  'invalid_contact',
  'duplicate_lead',
  'test_traffic',
  'fraud_or_abuse',
  'agent_generated',
  'booking_cancelled',
] as const;

export type BillableOutcomeType = (typeof BILLABLE_OUTCOME_TYPES)[number];
export type OutcomeDisqualifier = (typeof OUTCOME_DISQUALIFIERS)[number];

export const outcomeCandidateSchema = z.object({
  funnelId: z.string().uuid(),
  consent: z.boolean(),
  contactChannel: z.enum(['email', 'phone', 'both']).nullable(),
  transactionType: z.enum(['purchase', 'lease', 'sell', 'unknown']),
  hasLocation: z.boolean(),
  verifiedListingIds: z.array(z.string().trim().min(1).max(120)).max(8),
  hasTimeline: z.boolean(),
  hasBudget: z.boolean(),
  requestedNextStep: z.enum([
    'discuss_listing',
    'refine_search',
    'schedule_tour',
    'selling_guidance',
    'general_question',
  ]),
  booking: z.object({
    id: z.string().uuid(),
    type: z.enum(['buyer_consultation', 'rental_consultation', 'property_tour', 'seller_consultation']),
    status: z.enum(['pending', 'confirmed', 'cancelled', 'completed']),
  }).strict().nullable(),
  disqualifiers: z.array(z.enum(OUTCOME_DISQUALIFIERS)).default([]),
}).strict();

export type OutcomeCandidate = z.infer<typeof outcomeCandidateSchema>;

type OutcomeDefinition = {
  priceUsd: number;
  requiredEvidence: readonly string[];
  attributionWindowDays: number;
  duplicateRule: string;
  supersedes: readonly BillableOutcomeType[];
  refundConditions: readonly OutcomeDisqualifier[];
};

const COMMON_REFUND_CONDITIONS = OUTCOME_DISQUALIFIERS;

export const OUTCOME_DEFINITIONS: Readonly<Record<BillableOutcomeType, OutcomeDefinition>> = {
  qualified_handoff: {
    priceUsd: 8,
    requiredEvidence: ['consent', 'valid contact', 'transaction type', 'location or verified listing', 'timeline', 'requested next step', 'budget when buying or leasing'],
    attributionWindowDays: 30,
    duplicateRule: 'One qualified outcome per tenant and consumer funnel in the attribution window.',
    supersedes: [],
    refundConditions: COMMON_REFUND_CONDITIONS,
  },
  property_specific_handoff: {
    priceUsd: 12,
    requiredEvidence: ['all qualified handoff evidence', 'at least one verified listing ID'],
    attributionWindowDays: 30,
    duplicateRule: 'Repeated discussion of listings in the same funnel remains one property-specific outcome.',
    supersedes: ['qualified_handoff'],
    refundConditions: COMMON_REFUND_CONDITIONS,
  },
  buyer_consultation_booked: {
    priceUsd: 20,
    requiredEvidence: ['all qualified handoff evidence', 'authoritative confirmed buyer or rental consultation booking'],
    attributionWindowDays: 30,
    duplicateRule: 'Reschedules retain the original outcome; only one consultation outcome is billable per funnel.',
    supersedes: ['qualified_handoff', 'property_specific_handoff'],
    refundConditions: COMMON_REFUND_CONDITIONS,
  },
  property_tour_booked: {
    priceUsd: 35,
    requiredEvidence: ['all qualified handoff evidence', 'verified listing ID', 'authoritative confirmed property-tour booking'],
    attributionWindowDays: 30,
    duplicateRule: 'Reschedules and multiple tour times in the same funnel remain one tour outcome.',
    supersedes: ['qualified_handoff', 'property_specific_handoff', 'buyer_consultation_booked'],
    refundConditions: COMMON_REFUND_CONDITIONS,
  },
  seller_consultation_booked: {
    priceUsd: 45,
    requiredEvidence: ['all applicable qualified handoff evidence', 'authoritative confirmed seller-consultation booking'],
    attributionWindowDays: 30,
    duplicateRule: 'Reschedules retain the original outcome; only one seller consultation is billable per funnel.',
    supersedes: ['qualified_handoff'],
    refundConditions: COMMON_REFUND_CONDITIONS,
  },
};

export type OutcomeClassification = {
  outcome: BillableOutcomeType | null;
  priceUsd: number | null;
  eligible: boolean;
  reasons: string[];
};

const OUTCOME_PRIORITY: Record<BillableOutcomeType, number> = {
  qualified_handoff: 1,
  property_specific_handoff: 2,
  buyer_consultation_booked: 3,
  property_tour_booked: 4,
  seller_consultation_booked: 4,
};

export function progressOutcome(previous: BillableOutcomeType | null, next: BillableOutcomeType | null) {
  if (!next) return { outcome: previous, supersedes: null, duplicate: false };
  if (!previous) return { outcome: next, supersedes: null, duplicate: false };
  if (previous === next || OUTCOME_PRIORITY[next] <= OUTCOME_PRIORITY[previous]) {
    return { outcome: previous, supersedes: null, duplicate: previous === next };
  }
  return { outcome: next, supersedes: previous, duplicate: false };
}

export function classifyOutcome(candidateInput: OutcomeCandidate): OutcomeClassification {
  const candidate = outcomeCandidateSchema.parse(candidateInput);
  if (candidate.disqualifiers.length) {
    return result(null, candidate.disqualifiers.map((reason) => `disqualified:${reason}`));
  }

  const missing = qualificationGaps(candidate);
  if (missing.length) return result(null, missing.map((reason) => `missing:${reason}`));

  const confirmedBooking = candidate.booking?.status === 'confirmed' || candidate.booking?.status === 'completed'
    ? candidate.booking
    : null;

  if (confirmedBooking?.type === 'property_tour') {
    if (!candidate.verifiedListingIds.length) return result('qualified_handoff', ['booking:tour_missing_verified_listing']);
    return result('property_tour_booked', ['booking:property_tour']);
  }
  if (confirmedBooking?.type === 'seller_consultation' && candidate.transactionType === 'sell') {
    return result('seller_consultation_booked', ['booking:seller_consultation']);
  }
  if (
    (confirmedBooking?.type === 'buyer_consultation' || confirmedBooking?.type === 'rental_consultation')
    && (candidate.transactionType === 'purchase' || candidate.transactionType === 'lease')
  ) {
    return result('buyer_consultation_booked', [`booking:${confirmedBooking.type}`]);
  }
  if (candidate.verifiedListingIds.length) {
    return result('property_specific_handoff', ['handoff:verified_listing']);
  }
  return result('qualified_handoff', ['handoff:qualified']);
}

function qualificationGaps(candidate: OutcomeCandidate) {
  const gaps: string[] = [];
  if (!candidate.consent) gaps.push('consent');
  if (!candidate.contactChannel) gaps.push('valid_contact');
  if (candidate.transactionType === 'unknown') gaps.push('transaction_type');
  if (!candidate.hasLocation && !candidate.verifiedListingIds.length) gaps.push('location_or_listing');
  if (!candidate.hasTimeline) gaps.push('timeline');
  if (candidate.requestedNextStep === 'general_question') gaps.push('commercial_next_step');
  if ((candidate.transactionType === 'purchase' || candidate.transactionType === 'lease') && !candidate.hasBudget) gaps.push('budget');
  return gaps;
}

function result(outcome: BillableOutcomeType | null, reasons: string[]): OutcomeClassification {
  return {
    outcome,
    priceUsd: outcome ? OUTCOME_DEFINITIONS[outcome].priceUsd : null,
    eligible: outcome !== null,
    reasons,
  };
}
