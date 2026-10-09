import { describe, expect, it } from 'vitest';
import { possibleUtcInstantsForLocalDateTime, readWeeklyReviewEvidence } from '@/lib/realtor-workspace/progress';
import { occurrenceActionSchema } from '@/lib/realtor-workspace/contracts';

describe('seller outcomes and weekly review evidence', () => {
  it('keeps legacy v1 reviews readable', () => {
    expect(readWeeklyReviewEvidence({ weeklyReview: {
      version: 1, reviewedUpcomingDates: true, reviewedMissingExpenses: true, priority: 'Follow up',
      timeZone: 'America/Chicago', localWeekKey: '2026-10-05',
    } })).toMatchObject({ version: 1, localWeekKey: '2026-10-05', priority: 'Follow up' });
  });

  it('reads v2 seller outcome, chosen action, and bounded friction evidence', () => {
    expect(readWeeklyReviewEvidence({ weeklyReview: {
      version: 2, reviewedUpcomingDates: true, reviewedMissingExpenses: true, reviewedSellerOutcomes: true,
      priority: 'Improve follow-up', chosenNextAction: 'Call three opted-in sellers', friction: 'Photos were delayed',
      timeZone: 'America/Chicago', localWeekKey: '2026-10-05',
    } })).toMatchObject({ version: 2, reviewedSellerOutcomes: true, chosenNextAction: 'Call three opted-in sellers' });
    expect(readWeeklyReviewEvidence({ weeklyReview: {
      version: 2, reviewedUpcomingDates: true, reviewedMissingExpenses: true, reviewedSellerOutcomes: true,
      priority: 'Improve follow-up', chosenNextAction: 'Call three opted-in sellers', friction: 'x'.repeat(501),
      timeZone: 'America/Chicago', localWeekKey: '2026-10-05',
    } })).toBeNull();
  });

  it('accepts both legacy and v2 completion payloads at the API contract', () => {
    const base = { action: 'complete', expectedRevision: 2, requestKey: '123e4567-e89b-42d3-a456-426614174000' };
    expect(occurrenceActionSchema.safeParse({ ...base, completionDetails: { weeklyReview: {
      reviewedUpcomingDates: true, reviewedMissingExpenses: true, priority: 'Follow up',
    } } }).success).toBe(true);
    expect(occurrenceActionSchema.safeParse({ ...base, completionDetails: { weeklyReview: {
      version: 2, reviewedUpcomingDates: true, reviewedMissingExpenses: true, reviewedSellerOutcomes: true,
      priority: 'Follow up', chosenNextAction: 'Call three sellers', friction: null,
    } } }).success).toBe(true);
  });

  it('rejects spring-forward gaps and requires a choice for repeated fall-back times', () => {
    expect(possibleUtcInstantsForLocalDateTime('2026-03-08T02:30', 'America/Chicago')).toHaveLength(0);
    expect(possibleUtcInstantsForLocalDateTime('2026-11-01T01:30', 'America/Chicago')).toHaveLength(2);
  });
});
