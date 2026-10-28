import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import {
  createSellerBookingCapability,
  SELLER_BOOKING_CAPABILITY_TTL_SECONDS,
  verifySellerBookingCapability,
} from '@/lib/scheduling/sellerBookingCapability.server';

const identity = {
  leadId: 'b73fd9d7-3483-4e28-a1ed-315617550cb7',
  funnelId: 'edc0d3bb-89c4-44d4-bb4d-23ad174e783b',
  agentId: 'owner-site-1',
  site: 'taz',
};
const secret = 'local-test-signing-key-with-more-than-32-bytes';
const now = Date.parse('2026-10-19T18:00:00.000Z');

describe('seller booking capability', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('signs a short-lived token bound to the saved seller identity and purpose', () => {
    const issued = createSellerBookingCapability(identity, secret, now);
    const claims = verifySellerBookingCapability(issued.token, secret, now + 1000);
    expect(claims).toMatchObject({
      version: 1,
      purpose: 'seller_consultation',
      identity,
      issuedAt: now / 1000,
      expiresAt: now / 1000 + SELLER_BOOKING_CAPABILITY_TTL_SECONDS,
    });
    expect(issued.expiresAt).toBe(new Date((now / 1000 + SELLER_BOOKING_CAPABILITY_TTL_SECONDS) * 1000).toISOString());
  });

  it('rejects tampering, a different signing key, malformed input, and oversized tokens', () => {
    const token = createSellerBookingCapability(identity, secret, now).token;
    expect(verifySellerBookingCapability(`${token}x`, secret, now)).toBeNull();
    expect(verifySellerBookingCapability(token, `${secret}-other`, now)).toBeNull();
    expect(verifySellerBookingCapability('not-a-capability', secret, now)).toBeNull();
    expect(verifySellerBookingCapability('x'.repeat(4097), secret, now)).toBeNull();
  });

  it('rejects expired and not-yet-valid capabilities', () => {
    const token = createSellerBookingCapability(identity, secret, now).token;
    expect(verifySellerBookingCapability(token, secret, now + (SELLER_BOOKING_CAPABILITY_TTL_SECONDS + 1) * 1000)).toBeNull();
    expect(verifySellerBookingCapability(token, secret, now - 1000)).toBeNull();
  });

  it('rejects invalid identities and weak signing keys', () => {
    expect(() => createSellerBookingCapability({ ...identity, site: '' }, secret, now)).toThrow();
    expect(() => createSellerBookingCapability(identity, 'short', now)).toThrow(/at least 32 bytes/);
    expect(() => verifySellerBookingCapability('invalid', 'short', now)).toThrow(/at least 32 bytes/);
  });
});
