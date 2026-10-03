import { beforeEach, describe, expect, it, vi } from 'vitest';
import React from 'react';

vi.mock('server-only', () => ({}));

const mocks = vi.hoisted(() => ({
  applyPublicApiRateLimit: vi.fn(),
  getTenantSite: vi.fn(),
  insert: vi.fn(),
  from: vi.fn(),
  select: vi.fn(),
  eq: vi.fn(),
  maybeSingle: vi.fn(),
}));

vi.mock('@/lib/core/publicApiRateLimit', () => ({ applyPublicApiRateLimit: mocks.applyPublicApiRateLimit }));
vi.mock('@/lib/sites/siteData', () => ({ getTenantSite: mocks.getTenantSite }));
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: mocks.from } }));

import { POST } from '@/app/api/lead-magnets/route';

const validPayload = {
  offerKey: 'keller-westlake-seller-plan',
  offerVersion: '2',
  submissionId: 'eb18142c-652c-4d43-b467-17c53ae3ea91',
  name: 'Taylor Seller',
  email: 'TAYLOR@example.com',
  requestKind: 'pricing_review',
  timing: 'one-to-three-months',
  requestedContact: true,
  marketingOptIn: false,
  campaign: { source: 'website', medium: 'organic', campaign: null, content: null },
};

function request(body: unknown = validPayload, headers: Record<string, string> = {}) {
  return new Request('https://sunsetpulse.app/api/lead-magnets', {
    method: 'POST',
    headers: { host: 'sunsetpulse.app', origin: 'https://sunsetpulse.app', 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.KELLER_WESTLAKE_AGENT_SITE = 'taz';
  process.env.NODE_ENV = 'test';
  mocks.applyPublicApiRateLimit.mockResolvedValue(null);
  mocks.getTenantSite.mockResolvedValue({ isPublished: true, status: 'active', agentId: 'owner-site-1', siteName: 'Owner Site' });
  mocks.insert.mockResolvedValue({ error: null });
  mocks.maybeSingle.mockResolvedValue({ data: null, error: null });
  mocks.from.mockReturnValue({ insert: mocks.insert, select: mocks.select });
  mocks.select.mockReturnValue({ eq: mocks.eq });
  mocks.eq.mockReturnValue({ eq: mocks.eq, maybeSingle: mocks.maybeSingle });
});

describe('seller-plan lead route', () => {
  it('stores a bounded, owner-routed CMA request without property-address details', async () => {
    const response = await POST(request());
    const body = await response.json();
    const [table] = mocks.from.mock.calls[0];
    const [record] = mocks.insert.mock.calls[0];

    expect(response.status).toBe(201);
    expect(body).toEqual({ success: true, accepted: true, duplicate: false });
    expect(table).toBe('agent_site_leads');
    expect(record).toMatchObject({ agent_id: 'owner-site-1', site: 'taz', source: 'seller_plan', email: 'taylor@example.com', preferred_contact: 'email' });
    expect(record.metadata.sellerPlan.requestedContact.granted).toBe(true);
    expect(record.metadata.sellerPlan.marketingOptIn.granted).toBe(false);
    expect(record.metadata.sellerPlan.requestKind).toBe('pricing_review');
    expect(record.message).toContain('personally reviewed pricing / CMA conversation');
    expect(record.message).not.toContain('Example Road');
    expect(record.metadata.sellerPlan.requestFingerprint).toBeTruthy();
    expect(record.idempotency_key).toMatch(/^[a-f0-9]{64}$/);
    expect(mocks.applyPublicApiRateLimit).toHaveBeenCalledWith(expect.any(Request), 'seller-plan-request', 3, 60, { requireDistributed: true });
  });

  it('rejects client-selected ownership and unknown fields', async () => {
    const response = await POST(request({ ...validPayload, agentId: 'attacker', site: 'someone-else' }));
    expect(response.status).toBe(400);
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it('rejects a public street address field until private owner-scoped CMA storage exists', async () => {
    const response = await POST(request({ ...validPayload, propertyAddress: '100 Example Road' }));
    expect(response.status).toBe(400);
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it('rejects foreign origin and throttles through the shared distributed limiter', async () => {
    const originResponse = await POST(request(validPayload, { origin: 'https://evil.example' }));
    expect(originResponse.status).toBe(403);
    expect(mocks.applyPublicApiRateLimit).not.toHaveBeenCalled();

    mocks.applyPublicApiRateLimit.mockResolvedValueOnce(new Response('limited', { status: 429 }));
    const limited = await POST(request());
    expect(limited.status).toBe(429);
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it('fails closed until an owner profile is configured, active and published', async () => {
    mocks.getTenantSite.mockResolvedValueOnce({ isPublished: false, status: 'draft', agentId: 'owner-site-1' });
    const response = await POST(request());
    expect(response.status).toBe(503);
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it('returns the same durable receipt for an identical retry and conflicts on changed details', async () => {
    await POST(request());
    const [savedRecord] = mocks.insert.mock.calls[0];
    mocks.insert.mockResolvedValueOnce({ error: { code: '23505', message: 'duplicate' } });
    mocks.maybeSingle.mockResolvedValueOnce({ data: { metadata: savedRecord.metadata }, error: null });
    const duplicate = await POST(request());
    expect(duplicate.status).toBe(200);
    expect(await duplicate.json()).toMatchObject({ success: true, accepted: true, duplicate: true });

    mocks.insert.mockResolvedValueOnce({ error: { code: '23505', message: 'duplicate' } });
    const changed = await POST(request({ ...validPayload, requestKind: 'seller_plan' }));
    expect(changed.status).toBe(409);
  });

  it('rejects oversized requests before using the shared rate-limit service', async () => {
    const response = await POST(request({ ...validPayload, message: 'x'.repeat(13_000) }));
    expect(response.status).toBe(413);
    expect(mocks.applyPublicApiRateLimit).not.toHaveBeenCalled();
  });

  it('treats the honeypot as a no-op and does not emit email, SMS, or AI effects', async () => {
    const response = await POST(request({ ...validPayload, company: 'Bot completion' }));
    expect(response.status).toBe(200);
    expect(mocks.from).not.toHaveBeenCalled();
    expect(mocks.getTenantSite).not.toHaveBeenCalled();
  });
});
