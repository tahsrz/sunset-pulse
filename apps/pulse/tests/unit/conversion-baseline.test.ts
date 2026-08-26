import { describe, expect, it } from 'vitest';
import { calculateConversionDeltas } from '@/lib/profit/conversionBaseline';

describe('LUNA-402 conversion baseline', () => {
  it('calculates observed percentage-point deltas against a frozen baseline', () => {
    expect(calculateConversionDeltas({ baseline: { handoffPercent: 20, appointmentPercent: 10 }, observed: { handoffPercent: 22.5, appointmentPercent: 8 } })).toEqual({ handoffConversionDeltaPercent: 2.5, appointmentConversionDeltaPercent: -2 });
  });
  it('rejects malformed baseline rates', () => {
    expect(() => calculateConversionDeltas({ baseline: { handoffPercent: -1, appointmentPercent: 10 }, observed: { handoffPercent: 20, appointmentPercent: 10 } })).toThrow();
  });
});
