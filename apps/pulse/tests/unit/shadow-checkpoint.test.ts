import { describe, expect, it } from 'vitest';
import { aggregateShadowCheckpoints } from '@/lib/profit/shadowCheckpoint';

const checkpoint = (date: string, marginPercent: number | null = 80) => ({ date, marginPercent, duplicateRatePercent: 0.5, disputeRatePercent: 2, pipelineMultiple: 6, handoffConversionDeltaPercent: 1, appointmentConversionDeltaPercent: 1 });

describe('LUNA-403 shadow checkpoints', () => {
  it('keeps incomplete windows in shadow', () => expect(aggregateShadowCheckpoints({ checkpoints: [checkpoint('2026-08-01')], legalApproved: true }).decision.decision).toBe('continue_shadow'));
  it('aggregates a complete passing window to launch', () => {
    const checkpoints = Array.from({ length: 14 }, (_, index) => checkpoint(`2026-08-${String(index + 1).padStart(2, '0')}`));
    const result = aggregateShadowCheckpoints({ checkpoints, legalApproved: true });
    expect(result.complete).toBe(true); expect(result.decision.decision).toBe('launch');
  });
  it('keeps missing daily measurements unknown', () => expect(aggregateShadowCheckpoints({ checkpoints: [checkpoint('2026-08-01', null)], legalApproved: true }).averages.marginPercent).toBeNull());
  it('names incomplete economic metrics without treating them as zero', () => {
    const result = aggregateShadowCheckpoints({ checkpoints: [checkpoint('2026-08-01', null)], legalApproved: true });
    expect(result.unknownMetricCount).toBe(1); expect(result.unknownMetrics).toEqual(['marginPercent']);
  });
});
