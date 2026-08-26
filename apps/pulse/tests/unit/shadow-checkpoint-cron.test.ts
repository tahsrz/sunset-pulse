import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({ analytics: vi.fn(), invoice: vi.fn(), costs: vi.fn(), quality: vi.fn(), baseline: vi.fn(), persist: vi.fn() }));
vi.mock('@/lib/profit/profitFunnelAnalytics', () => ({ loadProfitFunnelAnalytics: mocks.analytics }));
vi.mock('@/lib/profit/shadowInvoice', () => ({ loadShadowInvoice: mocks.invoice }));
vi.mock('@/lib/profit/internalCostLedger', () => ({ loadInternalCostSummary: mocks.costs }));
vi.mock('@/lib/profit/shadowQuality', () => ({ loadShadowQuality: mocks.quality }));
vi.mock('@/lib/profit/conversionBaselineStore', () => ({ loadConversionBaseline: mocks.baseline }));
vi.mock('@/lib/profit/shadowCheckpoint', () => ({ persistShadowCheckpoint: mocks.persist }));

import { GET } from '@/app/api/admin/profit/checkpoints/cron/route';

describe('shadow checkpoint cron', () => {
  beforeEach(() => {
    vi.clearAllMocks(); process.env.CRON_SECRET = 'profit-secret'; delete process.env.SHADOW_BILLING_SITE;
    mocks.analytics.mockResolvedValue({ leads: { estimatedPipelineValue: 600 }, funnel: [] });
    mocks.invoice.mockResolvedValue({ estimatedTotalUsd: 100, outcomeCount: 2, creditCount: 1, evidenceCoveragePercent: 75 });
    mocks.costs.mockResolvedValue({ totalUsd: 20, knownEntries: 4 });
    mocks.quality.mockResolvedValue({ duplicateRatePercent: 0, disputeRatePercent: 0, observedRows: 2 });
    mocks.baseline.mockResolvedValue(null);
    mocks.persist.mockResolvedValue({ id: 'checkpoint-1' });
  });
  it('rejects missing authorization', async () => expect((await GET(request(undefined, 'agent-one'))).status).toBe(401));
  it('requires a tenant site', async () => expect((await GET(request('Bearer profit-secret'))).status).toBe(400));
  it('persists a conservative checkpoint for a valid tenant', async () => {
    const response = await GET(request('Bearer profit-secret', 'agent-one.sunsetpulse.app'));
    expect(response.status).toBe(200);
    expect(mocks.persist).toHaveBeenCalledWith(expect.objectContaining({ tenantSite: 'agent-one.sunsetpulse.app', checkpoint: expect.objectContaining({ marginPercent: 80, pipelineMultiple: 6, disputeRatePercent: 0, duplicateRatePercent: 0 }) }));
    expect(mocks.persist).toHaveBeenCalledWith(expect.objectContaining({ evidence: expect.objectContaining({ invoiceCreditCount: 1, invoiceEvidenceCoveragePercent: 75 }) }));
  });
  it('persists conversion deltas when a baseline and observations exist', async () => {
    mocks.analytics.mockResolvedValue({ leads: { estimatedPipelineValue: 600 }, funnel: [{ id: 'handoffCompleted', conversionRate: 22 }, { id: 'tourRequested', conversionRate: 8 }] });
    mocks.baseline.mockResolvedValue({ tenantSite: 'agent-one.sunsetpulse.app', windowStart: '2026-07-01T00:00:00.000Z', windowEnd: '2026-07-31T00:00:00.000Z', handoffPercent: 20, appointmentPercent: 10 });
    await GET(request('Bearer profit-secret', 'agent-one.sunsetpulse.app'));
    expect(mocks.persist).toHaveBeenCalledWith(expect.objectContaining({ checkpoint: expect.objectContaining({ handoffConversionDeltaPercent: 2, appointmentConversionDeltaPercent: -2 }) }));
  });
});

function request(authorization?: string, site?: string) {
  return new NextRequest(`http://localhost/api/admin/profit/checkpoints/cron${site ? `?site=${site}` : ''}`, { headers: authorization ? { authorization } : {} });
}
