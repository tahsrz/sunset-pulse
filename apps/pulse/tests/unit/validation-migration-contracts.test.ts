import { describe, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: {} }));
import { sellerPlanLeadSchema } from '@/lib/marketing/leadMagnetContract';
import { listingDiscoveryInputSchema } from '@/lib/data/listingDiscovery';
import { listingSchema } from '@/lib/data/listingContract';
import { workspaceIdSchema } from '@/lib/platform/contracts/identity';
import { savedSellerIdentitySchema, sellerAvailabilityResultSchema } from '@/lib/scheduling/sellerConsultationContract';
import { internalCostEntrySchema } from '@/lib/profit/internalCostLedger';
import { LeadSchema } from '@/lib/core/validation';

const legacyId = '11111111-1111-1111-1111-111111111111';
const seller = {
  offerKey: 'keller-westlake-seller-plan', offerVersion: '2', submissionId: legacyId,
  name: '  Example Seller  ', email: ' seller@example.com ', requestKind: 'seller_plan',
  timing: 'exploring', requestedContact: true, marketingOptIn: false,
};

describe('validation migration contracts', () => {
  it('keeps the seller intake payload and normalization stable', () => {
    expect(sellerPlanLeadSchema.parse(seller)).toEqual({ ...seller, name: 'Example Seller', email: 'seller@example.com' });
    expect(sellerPlanLeadSchema.parse({ ...seller, campaign: { source: null } }).campaign).toEqual({ source: null });
    for (const invalid of [
      { ...seller, requestedContact: false }, { ...seller, email: null },
      { ...seller, requestKind: 'book_now' }, { ...seller, tenantId: 'client-selected' },
    ]) expect(sellerPlanLeadSchema.safeParse(invalid).success).toBe(false);
  });

  it('preserves existing UUID-shaped database identifiers without widening their shape', () => {
    expect(workspaceIdSchema.parse(legacyId)).toBe(legacyId);
    expect(savedSellerIdentitySchema.parse({ leadId: legacyId, funnelId: legacyId, agentId: 'agent', site: 'site' })).toMatchObject({ leadId: legacyId });
    for (const value of ['not-an-id', legacyId.replace('1111', 'zzzz'), `${legacyId}x`]) {
      expect(workspaceIdSchema.safeParse(value).success).toBe(false);
    }
  });

  it('keeps omitted and empty optional numeric filters absent while coercing valid numbers', () => {
    const absent = listingDiscoveryInputSchema.parse({ priceMin: '', priceMax: null });
    expect(absent.priceMin).toBeUndefined();
    expect(absent.priceMax).toBeUndefined();
    expect(absent).toMatchObject({ page: 1, pageSize: 24, sort: 'newest', maxAgeHours: 720 });
    expect(listingDiscoveryInputSchema.parse({ priceMin: '200', priceMax: '400' })).toMatchObject({ priceMin: 200, priceMax: 400 });
    expect(listingDiscoveryInputSchema.safeParse({ priceMin: '400', priceMax: '200' }).success).toBe(false);
    expect(listingDiscoveryInputSchema.safeParse({ radiusMiles: 5 }).success).toBe(false);
  });

  it('keeps nested listing defaults and unknown-key stripping stable', () => {
    const parsed = listingSchema.parse({ id: 'listing', _id: 'listing', name: 'Example', location: {}, unexpected: true });
    expect(parsed.location).toEqual({ street: '', city: '', state: 'TX', zipcode: '' });
    expect(parsed.rates).toEqual({});
    expect(parsed.images).toEqual([]);
    expect(parsed.metadata).toEqual({});
    expect(parsed).not.toHaveProperty('unexpected');
  });

  it('does not materialize previously omitted optional lead defaults', () => {
    const input = { name: 'Example', email: 'example@example.com', property: 'property' };
    expect(LeadSchema.parse(input)).toEqual({ ...input, probability: 50, status: 'new' });
    expect(LeadSchema.parse({ ...input, budget: '250000', marketingConsent: false })).toEqual({
      ...input, budget: 250000, marketingConsent: false, probability: 50, status: 'new',
    });
    expect(LeadSchema.safeParse({ ...input, budget: '-1' }).success).toBe(false);
  });

  it('preserves cost-ledger defaults and heterogeneous evidence values', () => {
    const input = { tenantSite: 'test.sunsetpulse.app', costType: 'model', occurredAt: '2026-10-28T12:00:00.000Z', source: 'test', idempotencyKey: 'test-event-0000001' };
    expect(internalCostEntrySchema.parse(input)).toMatchObject({ funnelId: null, leadId: null, amountUsd: null, evidence: {} });
    const evidence = { count: 2, approved: false, nested: { source: 'test' }, missing: null };
    expect(internalCostEntrySchema.parse({ ...input, evidence }).evidence).toEqual(evidence);
    expect(internalCostEntrySchema.safeParse({ ...input, occurredAt: 'yesterday' }).success).toBe(false);
  });

  it('rejects oversized availability responses at the existing collection bound', () => {
    const slot = { id: 'slot', startsAt: '2026-10-28T12:00:00Z', endsAt: '2026-10-28T12:30:00Z', timeZone: 'America/Chicago' };
    expect(sellerAvailabilityResultSchema.safeParse({ status: 'available', slots: Array(501).fill(slot) }).success).toBe(false);
  });
});
