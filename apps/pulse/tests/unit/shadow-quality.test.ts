import { describe, expect, it } from 'vitest';
import { summarizeShadowQuality } from '@/lib/profit/shadowQuality';

describe('LUNA-402 shadow quality', () => {
  it('calculates duplicate and dispute rates from ledger evidence', () => {
    const result = summarizeShadowQuality([
      { idempotencyKey: 'a', billingStatus: 'shadow', entryKind: 'charge' },
      { idempotencyKey: 'a', billingStatus: 'shadow', entryKind: 'charge' },
      { idempotencyKey: 'b', billingStatus: 'disputed', entryKind: 'charge' },
    ]);
    expect(result).toEqual({ duplicateRatePercent: 33.33333333333333, disputeRatePercent: 33.33333333333333, observedRows: 3 });
  });
  it('keeps quality unknown when there is no ledger evidence', () => expect(summarizeShadowQuality([])).toEqual({ duplicateRatePercent: null, disputeRatePercent: null, observedRows: 0 }));
});
