import { describe, expect, it } from 'vitest';
const { persistMock } = vi.hoisted(() => ({ persistMock: vi.fn() }));
vi.mock('@/lib/profit/internalCostLedger', async () => {
  const actual = await vi.importActual<typeof import('@/lib/profit/internalCostLedger')>('@/lib/profit/internalCostLedger');
  return { ...actual, persistInternalCost: persistMock };
});

import { buildCrawlerCostEvent, buildInfrastructureCostEvent, persistProviderCost, providerCostToLedgerEntry, summarizeOutcomeMargin } from '@/lib/profit/internalCostEvents';

describe('internal cost events', () => {
  it('normalizes provider events to stable ledger identity', () => {
    const entry = providerCostToLedgerEntry({ tenantSite: 'agent-one.sunsetpulse.app', funnelId: null, leadId: null, provider: 'openai', providerEventId: 'trace-1', costType: 'model', amountUsd: 0.02, occurredAt: '2026-08-25T12:00:00.000Z', evidence: { tokens: 1000 } });
    expect(entry).toMatchObject({ source: 'openai:trace-1', idempotencyKey: 'provider-cost:openai:trace-1', amountUsd: 0.02 });
  });
  it('keeps margin unknown when any cost is unknown', () => {
    expect(summarizeOutcomeMargin({ revenueUsd: 20, costsUsd: [0.5, null] })).toMatchObject({ totalCostUsd: null, grossMarginUsd: null, costsKnown: false });
  });
  it('calculates known gross margin', () => {
    expect(summarizeOutcomeMargin({ revenueUsd: 20, costsUsd: [0.5, 1.5] })).toMatchObject({ totalCostUsd: 2, grossMarginUsd: 18, grossMarginPercent: 90, costsKnown: true });
  });
  it('persists model and notification costs through the shared ledger boundary', async () => {
    persistMock.mockResolvedValue({ duplicate: false, entry: { id: 'cost-1' } });
    await persistProviderCost({ tenantSite: 'agent-one.sunsetpulse.app', funnelId: null, leadId: null, provider: 'resend', providerEventId: 'delivery-1', costType: 'email_sms', amountUsd: 0.006, occurredAt: '2026-08-25T12:00:00.000Z', evidence: {} });
    expect(persistMock).toHaveBeenCalledWith(expect.objectContaining({ costType: 'email_sms', amountUsd: 0.006, source: 'resend:delivery-1' }));
  });
  it('keeps crawler and infrastructure receipts distinct', () => {
    const input = { tenantSite: 'agent-one.sunsetpulse.app', funnelId: null, leadId: null, provider: 'vercel', providerEventId: 'usage-1', amountUsd: null, occurredAt: '2026-08-25T12:00:00.000Z', evidence: {} };
    expect(buildCrawlerCostEvent({ ...input, provider: 'crawl4ai' }).costType).toBe('crawling');
    expect(buildInfrastructureCostEvent(input).costType).toBe('infrastructure');
  });
});
