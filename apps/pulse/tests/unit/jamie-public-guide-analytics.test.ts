import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: {} }));

import { buildPublicGuideConversionAnalytics } from '@/lib/ai/publicGuideAnalytics';

describe('Jamie public guide conversion analytics', () => {
  it('deduplicates funnel sessions and emits only privacy-safe unanswered groups', () => {
    const events = [
      event('open-1', 'PUBLIC_GUIDE_GUIDE_OPENED', 'public:session-1'),
      event('open-1-repeat', 'PUBLIC_GUIDE_GUIDE_OPENED', 'public:session-1'),
      event('open-2', 'PUBLIC_GUIDE_GUIDE_OPENED', 'public:session-2'),
      event('question-1', 'PUBLIC_GUIDE_QUESTION_ASKED', 'public:session-1'),
      event('tool-1', 'PUBLIC_GUIDE_TOOL_USED', 'public:session-1'),
      event('listing-1', 'PUBLIC_GUIDE_LISTING_OPENED', 'public:session-1'),
      event('offer-1', 'PUBLIC_GUIDE_HANDOFF_OFFERED', 'public:session-1'),
      event('complete-1', 'PUBLIC_GUIDE_HANDOFF_COMPLETED', 'public:session-1'),
      event('unanswered-1', 'PUBLIC_GUIDE_UNANSWERED_QUESTION', 'public:session-2', {
        intentCategory: 'listing_search',
        outcome: 'listing_unverified',
        prompt: 'raw question that must never leave aggregation',
      }),
      event('unanswered-2', 'PUBLIC_GUIDE_UNANSWERED_QUESTION', 'public:session-2', {
        intentCategory: 'listing_search',
        outcome: 'safe_fallback',
      }),
    ];
    const leads = [
      { id: 'lead-1', metadata: { publicGuideDisposition: { value: 'qualified', at: '2026-07-20T10:00:00.000Z' } } },
      { id: 'lead-2', metadata: {} },
    ];

    const analytics = buildPublicGuideConversionAnalytics(events, leads);

    expect(analytics.funnel.map((stage) => stage.sessions)).toEqual([2, 1, 1, 1, 1]);
    expect(analytics.conversionRate).toBe(50);
    expect(analytics.unanswered).toEqual([{
      category: 'listing_search',
      count: 2,
      latestAt: '2026-07-20T12:00:00.000Z',
      outcomes: ['Listing unverified', 'Safe fallback'],
      sessions: 1,
    }]);
    expect(analytics.dispositionCounts.qualified).toBe(1);
    expect(analytics.dispositionCounts.unassigned).toBe(1);
    expect(JSON.stringify(analytics)).not.toContain('raw question');
    expect(JSON.stringify(analytics)).not.toContain('prompt');
  });

  it('coerces unknown event categories and lead metadata to safe fixed buckets', () => {
    const analytics = buildPublicGuideConversionAnalytics([
      event('unanswered-1', 'PUBLIC_GUIDE_UNANSWERED_QUESTION', null, {
        intentCategory: 'visitor-secret-category',
        outcome: 'visitor-secret-outcome',
      }),
    ], [{ id: 'lead-1', metadata: { publicGuideDisposition: { value: 'invented' } } }]);

    expect(analytics.unanswered[0]).toEqual(expect.objectContaining({
      category: 'other',
      outcomes: [],
      sessions: 1,
    }));
    expect(analytics.dispositionCounts.unassigned).toBe(1);
  });
});

function event(
  id: string,
  eventType: string,
  actorId: string | null,
  metadata: Record<string, unknown> = {},
) {
  return {
    id,
    event_type: eventType,
    actor_id: actorId,
    target_id: null,
    metadata,
    created_at: '2026-07-20T12:00:00.000Z',
  };
}
