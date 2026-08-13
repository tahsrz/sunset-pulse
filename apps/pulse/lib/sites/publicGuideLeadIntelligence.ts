import { z } from 'zod';
import type {
  PublicGuideHandoffBrief,
  PublicGuideHandoffInput,
} from '@/lib/ai/publicGuideHandoffContract';

export const publicGuideLeadIntelligenceSchema = z.object({
  schemaVersion: z.literal(1),
  score: z.number().int().min(0).max(100),
  level: z.enum(['developing', 'warm', 'high']),
  inferredIntent: z.enum([
    'active_buyer',
    'buyer_research',
    'general_inquiry',
    'location_research',
    'property_specific',
    'seller',
    'tour_ready',
  ]),
  reasons: z.array(z.object({
    code: z.string().trim().min(1).max(80),
    label: z.string().trim().min(1).max(180),
    points: z.number().int().min(0).max(100),
  }).strict()).max(12),
  recommendedAction: z.object({
    urgency: z.enum(['immediate', 'high', 'medium']),
    label: z.string().trim().min(1).max(160),
    recommendation: z.string().trim().min(1).max(500),
    channel: z.enum(['phone', 'email', 'either']),
  }).strict(),
  computedAt: z.string().datetime(),
}).strict();

export type PublicGuideLeadIntelligence = z.infer<typeof publicGuideLeadIntelligenceSchema>;

type IntelligenceRankableLead = {
  created_at: string;
  metadata?: Record<string, unknown> | null;
};

export function readPublicGuideLeadIntelligence(
  metadata: Record<string, unknown> | null | undefined,
): PublicGuideLeadIntelligence | null {
  const result = publicGuideLeadIntelligenceSchema.safeParse(metadata?.leadIntelligence);
  return result.success ? result.data : null;
}

export function sortLeadsByIntelligence<T extends IntelligenceRankableLead>(leads: readonly T[]): T[] {
  return [...leads].sort((left, right) => {
    const leftScore = readPublicGuideLeadIntelligence(left.metadata)?.score;
    const rightScore = readPublicGuideLeadIntelligence(right.metadata)?.score;

    if (leftScore !== undefined || rightScore !== undefined) {
      if (leftScore === undefined) return 1;
      if (rightScore === undefined) return -1;
      if (leftScore !== rightScore) return rightScore - leftScore;
    }

    return Date.parse(right.created_at) - Date.parse(left.created_at);
  });
}

export type PublicGuideBehaviorEvent = {
  event_type: string;
  target_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

type BuildLeadIntelligenceInput = {
  brief: PublicGuideHandoffBrief;
  events: PublicGuideBehaviorEvent[];
  handoff: PublicGuideHandoffInput;
  hasPhone: boolean;
  hasVerifiedListing: boolean;
  preferredContact: 'email' | 'phone' | 'either';
  now?: Date;
};

type ScoreReason = PublicGuideLeadIntelligence['reasons'][number];

export function buildPublicGuideLeadIntelligence(
  input: BuildLeadIntelligenceInput,
): PublicGuideLeadIntelligence {
  const reasons: ScoreReason[] = [];
  const addReason = (code: string, label: string, points: number) => {
    if (points > 0 && !reasons.some((reason) => reason.code === code)) {
      reasons.push({ code, label, points });
    }
  };

  addReason('contact_shared', 'Shared contact information and requested agent follow-up', 25);

  if (input.handoff.nextStep === 'schedule_tour') {
    addReason('tour_requested', 'Asked to plan a property tour', 30);
  } else if (input.handoff.nextStep === 'discuss_listing') {
    addReason('listing_discussion', 'Asked to discuss a specific property', 18);
  } else if (input.handoff.nextStep === 'selling_guidance') {
    addReason('seller_guidance', 'Requested guidance about selling', 18);
  } else if (input.handoff.nextStep === 'refine_search') {
    addReason('search_refinement', 'Asked the agent to refine the property search', 12);
  }

  if (input.hasVerifiedListing) {
    addReason('verified_listing', 'Handoff includes a verified active listing', 8);
  }

  const discussedListingCount = new Set(input.brief.discussedListingIds).size;
  if (discussedListingCount >= 2) {
    addReason('properties_compared', `Compared or discussed ${discussedListingCount} verified properties`, 10);
  }
  const comparisonEvent = input.events.find((event) => event.event_type === 'VISITOR_PROPERTIES_COMPARED');
  const comparedPropertyCount = Number(comparisonEvent?.metadata?.propertyCount || 0);
  if (comparedPropertyCount >= 2) {
    addReason('properties_compared', `Compared ${comparedPropertyCount} verified properties`, 10);
  }

  const questionCount = countEvents(input.events, 'PUBLIC_GUIDE_QUESTION_ASKED');
  if (questionCount >= 4 || input.brief.conversationTurnCount >= 8) {
    addReason('long_conversation', 'Had an extended Jamie conversation', 10);
  }

  const intentCategories = new Set(
    input.events
      .map((event) => event.metadata?.intentCategory)
      .filter((value): value is string => typeof value === 'string'),
  );
  if (intentCategories.has('buying_process')) {
    addReason('buying_questions', 'Asked buying-process questions', 8);
  }
  if (intentCategories.has('location_comparison')) {
    addReason('location_research', 'Researched or compared locations', 8);
  }

  const listingOpenEvents = input.events.filter((event) => (
    event.event_type === 'PUBLIC_GUIDE_LISTING_OPENED'
    || event.event_type === 'VISITOR_PROPERTY_VIEWED'
  ));
  const listingOpenCounts = countByTarget(listingOpenEvents);
  if (Array.from(listingOpenCounts.values()).some((count) => count >= 2)) {
    addReason('repeat_property_view', 'Returned to the same property more than once', 10);
  }

  if (isReturnVisit(input.events)) {
    addReason('return_visit', 'Returned to Jamie within 48 hours', 15);
  }

  const score = Math.min(100, reasons.reduce((total, reason) => total + reason.points, 0));
  const inferredIntent = inferIntent(input, intentCategories);
  const recommendedAction = recommendAction(input, inferredIntent, score);

  return publicGuideLeadIntelligenceSchema.parse({
    schemaVersion: 1,
    score,
    level: score >= 70 ? 'high' : score >= 45 ? 'warm' : 'developing',
    inferredIntent,
    reasons: reasons.sort((left, right) => right.points - left.points),
    recommendedAction,
    computedAt: (input.now || new Date()).toISOString(),
  });
}

function inferIntent(
  input: BuildLeadIntelligenceInput,
  categories: Set<string>,
): PublicGuideLeadIntelligence['inferredIntent'] {
  if (input.handoff.nextStep === 'schedule_tour') return 'tour_ready';
  if (input.handoff.nextStep === 'selling_guidance') return 'seller';
  if (input.handoff.nextStep === 'discuss_listing' || input.hasVerifiedListing) return 'property_specific';
  if (input.handoff.nextStep === 'refine_search') return 'active_buyer';
  if (categories.has('location_comparison')) return 'location_research';
  if (categories.has('buying_process') || categories.has('listing_search')) return 'buyer_research';
  return 'general_inquiry';
}

function recommendAction(
  input: BuildLeadIntelligenceInput,
  intent: PublicGuideLeadIntelligence['inferredIntent'],
  score: number,
): PublicGuideLeadIntelligence['recommendedAction'] {
  const canCall = input.hasPhone && input.preferredContact !== 'email';
  if (score >= 70 && canCall) {
    return {
      urgency: 'immediate',
      label: 'Call this lead first',
      recommendation: 'Call within 15 minutes, confirm the strongest stated need, and agree on one concrete next step.',
      channel: 'phone',
    };
  }
  if (intent === 'tour_ready') {
    return {
      urgency: 'immediate',
      label: 'Offer two tour times',
      recommendation: 'Confirm the property and send two specific showing windows today.',
      channel: canCall ? 'phone' : 'email',
    };
  }
  if (intent === 'seller') {
    return {
      urgency: 'high',
      label: 'Schedule a seller discovery call',
      recommendation: 'Confirm the property address, timeline, and reason for selling before preparing pricing guidance.',
      channel: canCall ? 'phone' : 'email',
    };
  }
  if (intent === 'property_specific') {
    return {
      urgency: 'high',
      label: 'Send verified property details',
      recommendation: 'Answer the property-specific question, include the verified listing packet, and suggest a tour.',
      channel: 'email',
    };
  }
  if (intent === 'active_buyer' || intent === 'buyer_research' || intent === 'location_research') {
    return {
      urgency: score >= 45 ? 'high' : 'medium',
      label: 'Confirm criteria and send matches',
      recommendation: 'Confirm location, budget, and timing, then send three to five matching active properties.',
      channel: 'email',
    };
  }
  return {
    urgency: 'medium',
    label: 'Clarify the lead goal',
    recommendation: 'Reply with one focused question about location, timing, or the outcome they want.',
    channel: input.preferredContact === 'phone' && input.hasPhone ? 'phone' : 'email',
  };
}

function countEvents(events: PublicGuideBehaviorEvent[], eventType: string) {
  return events.filter((event) => event.event_type === eventType).length;
}

function countByTarget(events: PublicGuideBehaviorEvent[]) {
  const counts = new Map<string, number>();
  for (const event of events) {
    if (!event.target_id) continue;
    counts.set(event.target_id, (counts.get(event.target_id) || 0) + 1);
  }
  return counts;
}

function isReturnVisit(events: PublicGuideBehaviorEvent[]) {
  const opened = events
    .filter((event) => (
      event.event_type === 'PUBLIC_GUIDE_GUIDE_OPENED'
      || event.event_type === 'VISITOR_PROPERTY_VIEWED'
    ))
    .map((event) => Date.parse(event.created_at))
    .filter(Number.isFinite)
    .sort((left, right) => left - right);
  if (opened.length < 2) return false;
  const elapsed = opened[opened.length - 1] - opened[0];
  return elapsed >= 30 * 60 * 1000 && elapsed <= 48 * 60 * 60 * 1000;
}
