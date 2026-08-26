import { describe, expect, it } from 'vitest';
import { buildShadowInvoice } from '@/lib/profit/shadowInvoice';

const base = { tenantSite: 'agent-one.sunsetpulse.app', periodStart: '2026-08-01T00:00:00.000Z', periodEnd: '2026-08-31T23:59:59.000Z', accountMinimumUsd: 10, includedCreditUsd: 5 };

describe('LUNA-401 shadow invoice', () => {
  it('summarizes charges, credits, and included credit without charging', () => {
    const invoice = buildShadowInvoice({ ...base, entries: [
      { id: '1', entryKind: 'charge', amountUsd: 20, billingStatus: 'shadow', evidence: { outcome: true } },
      { id: '2', entryKind: 'credit', amountUsd: 8, billingStatus: 'shadow', evidence: { reason: 'duplicate_lead' } },
    ] });
    expect(invoice).toMatchObject({ chargeTotalUsd: 20, creditTotalUsd: 8, estimatedTotalUsd: 10, evidenceCoveragePercent: 100, billingStatus: 'shadow', stripeSubmitted: false });
  });
  it('shows unknown evidence coverage for an empty period', () => {
    expect(buildShadowInvoice({ ...base, entries: [] }).evidenceCoveragePercent).toBeNull();
  });
});
