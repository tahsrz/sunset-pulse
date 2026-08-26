import { describe, expect, it } from 'vitest';
import fixtures from '@/config/outcome-classification-fixtures.json';
import {
  BILLABLE_OUTCOME_TYPES,
  OUTCOME_DEFINITIONS,
  classifyOutcome,
  outcomeCandidateSchema,
  progressOutcome,
  type BillableOutcomeType,
  type OutcomeCandidate,
} from '@/lib/profit/outcomeContract';

describe('LUNA-001 outcome contract', () => {
  it.each(fixtures)('classifies $id deterministically', (fixture) => {
    const candidate = outcomeCandidateSchema.parse(fixture.candidate) as OutcomeCandidate;
    const first = classifyOutcome(candidate);
    const independentReplay = classifyOutcome(JSON.parse(JSON.stringify(candidate)) as OutcomeCandidate);

    expect(first).toEqual(independentReplay);
    expect(first.outcome).toBe(fixture.expectedOutcome);
    expect(first.priceUsd).toBe(fixture.expectedPriceUsd);
  });

  it('defines evidence, deduplication, supersession, attribution, and refunds for every outcome', () => {
    for (const outcome of BILLABLE_OUTCOME_TYPES) {
      expect(OUTCOME_DEFINITIONS[outcome]).toEqual(expect.objectContaining({
        priceUsd: expect.any(Number),
        requiredEvidence: expect.any(Array),
        attributionWindowDays: 30,
        duplicateRule: expect.any(String),
        supersedes: expect.any(Array),
        refundConditions: expect.arrayContaining(['failed_delivery', 'duplicate_lead', 'test_traffic']),
      }));
    }
  });

  it('keeps outcome prices monotonic across the progression', () => {
    const prices = BILLABLE_OUTCOME_TYPES.map((outcome: BillableOutcomeType) => OUTCOME_DEFINITIONS[outcome].priceUsd);
    expect(prices).toEqual([8, 12, 20, 35, 45]);
  });

  it('rejects malformed evidence instead of guessing', () => {
    expect(outcomeCandidateSchema.safeParse({ funnelId: 'not-a-funnel' }).success).toBe(false);
  });

  it('blocks purchase qualification when budget evidence is missing', () => {
    const candidate = outcomeCandidateSchema.parse(fixtures[0].candidate) as OutcomeCandidate;
    const result = classifyOutcome({ ...candidate, hasBudget: false });
    expect(result).toMatchObject({ eligible: false, outcome: null });
    expect(result.reasons).toContain('missing:budget');
  });

  it('blocks duplicate attribution before outcome selection', () => {
    const candidate = outcomeCandidateSchema.parse(fixtures[0].candidate) as OutcomeCandidate;
    const result = classifyOutcome({ ...candidate, disqualifiers: ['duplicate_lead'] });
    expect(result).toMatchObject({ eligible: false, outcome: null });
    expect(result.reasons).toContain('disqualified:duplicate_lead');
  });

  it('keeps outcome progression monotonic and records supersession', () => {
    expect(progressOutcome('qualified_handoff', 'property_specific_handoff')).toEqual({ outcome: 'property_specific_handoff', supersedes: 'qualified_handoff', duplicate: false });
    expect(progressOutcome('property_tour_booked', 'qualified_handoff')).toEqual({ outcome: 'property_tour_booked', supersedes: null, duplicate: false });
    expect(progressOutcome('buyer_consultation_booked', 'buyer_consultation_booked')).toEqual({ outcome: 'buyer_consultation_booked', supersedes: null, duplicate: true });
  });
});
