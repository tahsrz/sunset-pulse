import { describe, expect, it } from 'vitest';
import { readBillingProductConfig } from '@/lib/profit/billingProductConfig';

describe('LUNA-501 billing product config', () => {
  it('keeps products disabled until legal and shadow gates pass', () => {
    expect(readBillingProductConfig({}).enabled).toBe(false);
    expect(readBillingProductConfig({ LUNA_LEGAL_APPROVED: 'true', LUNA_SHADOW_DECISION: 'launch' }).enabled).toBe(true);
  });
  it('uses the defined outcome price hypotheses', () => expect(readBillingProductConfig({}).outcomePrices.propertyTourBooked).toBe(35));
});
