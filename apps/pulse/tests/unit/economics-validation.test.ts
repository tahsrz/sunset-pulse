import { describe, expect, it } from 'vitest';
import { evaluateEconomicsScenario } from '@/lib/profit/economicsValidation';

const base = { name: 'normal' as const, revenueUsd: 100, costUsd: 20, duplicateRatePercent: 0.5, disputeRatePercent: 2, pipelineValueUsd: 600, handoffConversionPercent: 20, appointmentConversionPercent: 10, billedDollars: 100 };

describe('LUNA-402 economics validation', () => {
  it('passes the target scenario', () => expect(evaluateEconomicsScenario(base).targets).toEqual({ grossMargin: true, duplicates: true, disputes: true, pipeline: true }));
  it('keeps margin unknown when costs are incomplete', () => expect(evaluateEconomicsScenario({ ...base, name: 'heavy', costUsd: null }).targets.grossMargin).toBeNull());
  it('fails heavy usage when margin and dispute targets miss', () => expect(evaluateEconomicsScenario({ ...base, name: 'heavy', costUsd: 40, disputeRatePercent: 4 }).targets).toMatchObject({ grossMargin: false, disputes: false }));
});
