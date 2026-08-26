import { beforeEach, describe, expect, it, vi } from 'vitest';

const { supabaseAdminMock } = vi.hoisted(() => ({ supabaseAdminMock: { from: vi.fn() } }));
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: supabaseAdminMock }));

import { buildBillableOutcomeEntry, buildDisputeCreditEntry, buildOutcomeCompensationEntries, outcomePriceHypothesis, persistDisputeCredit, persistShadowOutcome } from '@/lib/profit/billableOutcomeLedger';

const base = {
  tenantSite: 'agent-one.sunsetpulse.app',
  agentId: 'agent-one',
  funnelId: '11111111-1111-4111-8111-111111111111',
  leadId: '22222222-2222-4222-8222-222222222222',
  bookingId: null,
  outcomeType: 'qualified_handoff' as const,
  amountUsd: 8,
  occurredAt: '2026-08-25T12:00:00.000Z',
  evidence: { consent: true, validContact: true, source: 'deterministic_contract_v1' },
  idempotencyKey: 'outcome:funnel-one:qualified:v1',
};

describe('LUNA-102 billable outcome ledger', () => {
  beforeEach(() => supabaseAdminMock.from.mockReset());

  it('builds a shadow charge with fixed USD evidence', () => {
    expect(buildBillableOutcomeEntry(base)).toEqual(expect.objectContaining({
      outcomeType: 'qualified_handoff',
      amountUsd: 8,
      currency: 'USD',
      attributionWindowDays: 30,
      billingStatus: 'shadow',
    }));
  });

  it('requires the configured price hypothesis for a charge', () => {
    expect(() => buildBillableOutcomeEntry({ ...base, amountUsd: 7 })).toThrow(/price hypothesis/);
  });

  it('requires credits and reversals to compensate an existing entry', () => {
    expect(() => buildBillableOutcomeEntry({ ...base, entryKind: 'credit', amountUsd: 8 })).toThrow(/compensate/);
    expect(buildBillableOutcomeEntry({
      ...base,
      entryKind: 'credit',
      amountUsd: 8,
      idempotencyKey: 'outcome:funnel-one:credit:v1',
      supersedesOutcomeId: '33333333-3333-4333-8333-333333333333',
    })).toEqual(expect.objectContaining({ entryKind: 'credit' }));
  });

  it('keeps price hypotheses centralized', () => {
    expect(outcomePriceHypothesis('property_tour_booked')).toBe(35);
  });

  it('persists a shadow outcome only after lead lineage is verified', async () => {
    const inserted = { id: '44444444-4444-4444-8444-444444444444', ...base, tenant_site: base.tenantSite, agent_id: base.agentId, funnel_id: base.funnelId, lead_id: base.leadId, booking_id: null, outcome_type: base.outcomeType, outcome_version: 1, entry_kind: 'charge', amount_usd: 8, currency: 'USD', occurred_at: base.occurredAt, attribution_window_days: 30, idempotency_key: base.idempotencyKey, supersedes_outcome_id: null, billing_status: 'shadow', status_reason: null };
    supabaseAdminMock.from.mockImplementation((table: string) => table === 'agent_site_leads'
      ? chain({ id: base.leadId, funnel_id: base.funnelId, agent_id: base.agentId, site: base.tenantSite })
      : chain(null, null, inserted));

    const result = await persistShadowOutcome(base);
    expect(result).toEqual({ entry: expect.objectContaining({ id: inserted.id }), duplicate: false });
  });

  it('rejects a lead whose tenant lineage does not match', async () => {
    supabaseAdminMock.from.mockImplementation(() => chain(null));
    await expect(persistShadowOutcome(base)).rejects.toThrow(/does not match the selected lead/);
  });

  it('creates a credit and replacement charge for a higher outcome', () => {
    const previous = { ...buildBillableOutcomeEntry(base), id: '33333333-3333-4333-8333-333333333333' };
    const next = buildBillableOutcomeEntry({ ...base, outcomeType: 'property_specific_handoff', amountUsd: 12, idempotencyKey: 'outcome-next-property-001' });
    const entries = buildOutcomeCompensationEntries({ previous, next });
    expect(entries).toHaveLength(2);
    expect(entries[0]).toMatchObject({ entryKind: 'credit', supersedesOutcomeId: previous.id, amountUsd: 0 });
    expect(entries[1]).toMatchObject({ entryKind: 'charge', outcomeType: 'property_specific_handoff', supersedesOutcomeId: previous.id, amountUsd: 12 });
  });

  it('builds an approved-reason credit for a disputed outcome', () => {
    const original = { ...buildBillableOutcomeEntry(base), id: '55555555-5555-4555-8555-555555555555' };
    const credit = buildDisputeCreditEntry({ original, reason: 'invalid_contact', evidence: { reviewedBy: 'operator-1' } });
    expect(credit).toMatchObject({ entryKind: 'credit', amountUsd: 0, supersedesOutcomeId: original.id, statusReason: 'Credit: invalid_contact.' });
    expect(credit.evidence).toMatchObject({ reviewedBy: 'operator-1', creditReason: 'invalid_contact' });
  });

  it('persists dispute credits through the lineage-checked writer', async () => {
    const original = { ...buildBillableOutcomeEntry(base), id: '66666666-6666-4666-8666-666666666666' };
    supabaseAdminMock.from.mockImplementation((table: string) => table === 'agent_site_leads'
      ? chain({ id: base.leadId, funnel_id: base.funnelId, agent_id: base.agentId, site: base.tenantSite })
      : chain(null, null, { id: 'credit-1' }));
    const result = await persistDisputeCredit({ original, reason: 'duplicate_lead' });
    expect(result.duplicate).toBe(false);
    expect(result.entry).toMatchObject({ id: 'credit-1' });
  });
});

function chain(data: any, error: any = null, insertedData: any = null) {
  const query: any = {
    select: () => query,
    eq: () => query,
    maybeSingle: async () => ({ data, error }),
    insert: () => query,
    single: async () => ({ data: insertedData, error }),
  };
  return query;
}
