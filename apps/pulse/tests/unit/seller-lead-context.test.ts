import { describe, expect, it } from 'vitest';
import { canContactSeller, readSellerLeadContext } from '@/lib/sites/sellerLeadContext';

const lead = {
  id: '11111111-1111-4111-8111-111111111111',
  created_at: '2026-10-05T12:00:00.000Z',
  agent_id: 'owner-site-1',
  site: 'taz',
  source: 'seller_plan',
  name: 'Taylor Seller',
  email: 'taylor@example.test',
  message: 'Seller plan request.',
  status: 'new' as const,
  metadata: { sellerPlan: {
    requestKind: 'seller_plan',
    timing: 'within-30-days',
    requestedContact: { granted: true, capturedAt: '2026-10-05T12:00:00.000Z' },
    marketingOptIn: { granted: false },
  } },
};

describe('seller lead context', () => {
  it('reads only valid seller request and consent data', () => {
    expect(readSellerLeadContext(lead)).toEqual({
      requestKind: 'seller_plan', timing: 'within-30-days', requestedContact: true, marketingOptIn: false,
    });
    expect(readSellerLeadContext({ ...lead, source: 'agent_site' })).toBeNull();
  });

  it('treats missing, malformed, and revoked consent as unavailable', () => {
    expect(readSellerLeadContext({ ...lead, metadata: {} })?.requestedContact).toBe(false);
    expect(readSellerLeadContext({ ...lead, metadata: { sellerPlan: {
      ...lead.metadata.sellerPlan,
      requestedContact: { granted: true, capturedAt: 'invalid' },
    } } })?.requestedContact).toBe(false);
    expect(readSellerLeadContext({ ...lead, metadata: { sellerPlan: {
      ...lead.metadata.sellerPlan,
      requestedContact: { ...lead.metadata.sellerPlan.requestedContact, revokedAt: '2026-10-06T12:00:00.000Z' },
    } } })?.requestedContact).toBe(false);
  });

  it('allows one requested response, then requires a new seller reply or separate marketing opt-in', () => {
    const attempt = '2026-10-05T13:00:00.000Z';
    expect(canContactSeller(lead)).toBe(true);
    expect(canContactSeller({ ...lead, contact_attempted_at: attempt })).toBe(false);
    expect(canContactSeller({ ...lead, contact_attempted_at: attempt, responded_at: '2026-10-05T14:00:00.000Z' })).toBe(true);
    const optedIn = { ...lead, metadata: { sellerPlan: {
      ...lead.metadata.sellerPlan,
      marketingOptIn: { granted: true, capturedAt: '2026-10-05T12:00:00.000Z' },
    } }, contact_attempted_at: attempt };
    expect(canContactSeller(optedIn)).toBe(true);
    expect(canContactSeller({ ...optedIn, metadata: { sellerPlan: {
      ...optedIn.metadata.sellerPlan,
      requestedContact: { ...lead.metadata.sellerPlan.requestedContact, revokedAt: '2026-10-06T12:00:00.000Z' },
    } } })).toBe(true);
    expect(canContactSeller({ ...lead, status: 'archived' })).toBe(false);
    expect(canContactSeller({ ...lead, email: '' })).toBe(false);
  });
});
