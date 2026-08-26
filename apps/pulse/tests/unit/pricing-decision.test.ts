import { describe, expect, it } from 'vitest';
import { evaluatePricingDecision } from '@/lib/profit/pricingDecision';

const base = { marginPercent: 80, duplicateRatePercent: 0.5, disputeRatePercent: 2, pipelineMultiple: 6, handoffConversionDeltaPercent: 1, appointmentConversionDeltaPercent: 1, evidenceDays: 14, legalApproved: true, severeTrustFailure: false };

describe('LUNA-403 pricing decision', () => {
  it('launches only when all gates pass', () => expect(evaluatePricingDecision(base)).toEqual({ decision: 'launch', reasons: ['all_launch_gates_passed'] }));
  it('continues shadow when evidence or approval is incomplete', () => expect(evaluatePricingDecision({ ...base, evidenceDays: 7, legalApproved: false }).decision).toBe('continue_shadow'));
  it('revises definitions for trust-rate failures', () => expect(evaluatePricingDecision({ ...base, disputeRatePercent: 4 }).decision).toBe('revise_definitions'));
  it('stops on severe trust failure', () => expect(evaluatePricingDecision({ ...base, severeTrustFailure: true }).decision).toBe('stop'));
});
