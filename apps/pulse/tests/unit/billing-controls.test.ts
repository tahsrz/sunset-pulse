import { describe, expect, it } from 'vitest';
import { evaluateBillingControls } from '@/lib/profit/billingControls';

describe('LUNA-503 billing controls', () => {
  it('raises graduated spend alerts and pauses at the cap', () => expect(evaluateBillingControls({ spendingLimitUsd: 100, estimatedInvoiceUsd: 100 })).toMatchObject({ alerts: [50, 80, 100], pauseRequired: true, shadowOnly: true }));
  it('keeps low utilization active', () => expect(evaluateBillingControls({ spendingLimitUsd: 100, estimatedInvoiceUsd: 25 }).pauseRequired).toBe(false));
});
