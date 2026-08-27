import { beforeEach, describe, expect, it, vi } from 'vitest';

const { supabaseAdminMock } = vi.hoisted(() => ({ supabaseAdminMock: { from: vi.fn() } }));
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: supabaseAdminMock }));

import { buildInternalCostEntry, persistInternalCost } from '@/lib/profit/internalCostLedger';

const base = {
  tenantSite: 'agent-one.sunsetpulse.app', funnelId: '11111111-1111-4111-8111-111111111111',
  leadId: '22222222-2222-4222-8222-222222222222', costType: 'model' as const,
  amountUsd: null, occurredAt: '2026-08-25T12:00:00.000Z', source: 'trace:abc',
  evidence: { tokens: 1200 }, idempotencyKey: 'cost-model-trace-abc-001',
};

const chain = (data: unknown, error: unknown = null) => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data, error }) }), single: async () => ({ data, error }) }), insert: () => ({ select: () => ({ single: async () => ({ data, error }) }) }) });

describe('internal cost ledger', () => {
  beforeEach(() => supabaseAdminMock.from.mockReset());
  it('preserves unknown cost as null', () => expect(buildInternalCostEntry(base).amountUsd).toBeNull());
  it('deduplicates by idempotency key', async () => {
    const existing = { id: 'cost-1', amount_usd: null };
    supabaseAdminMock.from.mockReturnValue(chain(existing));
    const result = await persistInternalCost(base);
    expect(result).toEqual({ entry: existing, duplicate: true });
  });
});
