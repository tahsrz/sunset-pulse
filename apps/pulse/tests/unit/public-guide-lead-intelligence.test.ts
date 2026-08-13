import { describe, expect, it } from 'vitest';
import { buildPublicGuideLeadIntelligence } from '@/lib/sites/publicGuideLeadIntelligence';

const brief = {
  schemaVersion: 1 as const,
  summary: 'Looking for a three-bedroom home in Denton and wants to tour one listing.',
  searchCriteria: {
    locations: ['Denton'],
    priceMin: null,
    priceMax: 500_000,
    bedsMin: 3,
    bathsMin: null,
    propertyTypes: ['Single family'],
    priorities: ['Schools'],
  },
  discussedListingIds: ['MLS-101', 'MLS-202'],
  statedNextStep: 'schedule_tour' as const,
  conversationTurnCount: 8,
  generatedBy: 'deterministic' as const,
  transcriptStored: false as const,
};

const handoff = {
  conversation: [{ role: 'user' as const, text: 'Can I tour this home?' }],
  discussedListingIds: ['MLS-101', 'MLS-202'],
  nextStep: 'schedule_tour' as const,
  sessionId: 'session-12345',
};

describe('public guide lead intelligence', () => {
  it('produces an explainable high-intent score and immediate action', () => {
    const intelligence = buildPublicGuideLeadIntelligence({
      brief,
      handoff,
      hasPhone: true,
      hasVerifiedListing: true,
      preferredContact: 'phone',
      now: new Date('2026-08-13T12:00:00.000Z'),
      events: [
        event('PUBLIC_GUIDE_GUIDE_OPENED', '2026-08-12T12:00:00.000Z'),
        event('PUBLIC_GUIDE_GUIDE_OPENED', '2026-08-13T11:00:00.000Z'),
        event('PUBLIC_GUIDE_QUESTION_ASKED', '2026-08-13T11:01:00.000Z', { intentCategory: 'buying_process' }),
        event('PUBLIC_GUIDE_LISTING_OPENED', '2026-08-13T11:02:00.000Z', null, 'MLS-101'),
        event('PUBLIC_GUIDE_LISTING_OPENED', '2026-08-13T11:03:00.000Z', null, 'MLS-101'),
      ],
    });

    expect(intelligence.score).toBe(100);
    expect(intelligence.level).toBe('high');
    expect(intelligence.inferredIntent).toBe('tour_ready');
    expect(intelligence.recommendedAction.label).toBe('Call this lead first');
    expect(intelligence.reasons.map((reason) => reason.code)).toEqual(expect.arrayContaining([
      'contact_shared',
      'tour_requested',
      'return_visit',
      'repeat_property_view',
    ]));
  });

  it('keeps a general handoff developing and recommends clarification', () => {
    const intelligence = buildPublicGuideLeadIntelligence({
      brief: {
        ...brief,
        discussedListingIds: [],
        statedNextStep: 'general_question',
        conversationTurnCount: 2,
      },
      handoff: { ...handoff, discussedListingIds: [], nextStep: 'general_question' },
      hasPhone: false,
      hasVerifiedListing: false,
      preferredContact: 'email',
      events: [],
    });

    expect(intelligence.score).toBe(25);
    expect(intelligence.level).toBe('developing');
    expect(intelligence.inferredIntent).toBe('general_inquiry');
    expect(intelligence.recommendedAction.label).toBe('Clarify the lead goal');
  });
});

function event(
  eventType: string,
  createdAt: string,
  metadata: Record<string, unknown> | null = null,
  targetId: string | null = null,
) {
  return {
    event_type: eventType,
    target_id: targetId,
    metadata,
    created_at: createdAt,
  };
}
