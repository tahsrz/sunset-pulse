import { beforeEach, describe, expect, it, vi } from 'vitest';
import React from 'react';

vi.mock('server-only', () => ({}));

const mocks = vi.hoisted(() => ({
  offer: vi.fn(),
  applyPublicApiRateLimit: vi.fn(),
  getTenantSite: vi.fn(),
  insert: vi.fn(),
  from: vi.fn(),
  select: vi.fn(),
  single: vi.fn(),
  eq: vi.fn(),
  maybeSingle: vi.fn(),
}));

vi.mock('@/lib/core/publicApiRateLimit', () => ({ applyPublicApiRateLimit: mocks.applyPublicApiRateLimit }));
vi.mock('@/lib/sites/siteData', () => ({ getTenantSite: mocks.getTenantSite }));
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: mocks.from } }));
vi.mock('@/lib/scheduling/sellerConsultationAuthority.server', () => ({ createSellerBookingOffer: mocks.offer }));

import { POST } from '@/app/api/lead-magnets/route';
import { saveSellerPlanLead } from '@/lib/marketing/sellerLeadIntake.server';

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
} as const;
const SAVED_LEAD_ID = 'b73fd9d7-3483-4e28-a1ed-315617550cb7';

function request(body: unknown = validPayload, headers: Record<string, string> = {}) {
  return new Request('https://sunsetpulse.app/api/lead-magnets', {
    method: 'POST',
    headers: { host: 'sunsetpulse.app', origin: 'https://sunsetpulse.app', 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.offer.mockResolvedValue(null);
  process.env.KELLER_WESTLAKE_AGENT_SITE = 'taz';
  vi.stubEnv('NODE_ENV', 'test');
  mocks.applyPublicApiRateLimit.mockResolvedValue(null);
  mocks.getTenantSite.mockResolvedValue({ isPublished: true, status: 'active', agentId: 'owner-site-1', siteName: 'Owner Site' });
  mocks.insert.mockImplementation(() => ({ select: mocks.select }));
  mocks.single.mockImplementation(async () => {
    const record = mocks.insert.mock.calls.at(-1)?.[0] as Record<string, unknown> | undefined;
    return { data: { id: SAVED_LEAD_ID, funnel_id: record?.funnel_id, agent_id: record?.agent_id, site: record?.site }, error: null };
  });
  mocks.maybeSingle.mockResolvedValue({ data: null, error: null });
  mocks.from.mockReturnValue({ insert: mocks.insert, select: mocks.select });
  mocks.select.mockReturnValue({ single: mocks.single, eq: mocks.eq });
  mocks.eq.mockReturnValue({ eq: mocks.eq, maybeSingle: mocks.maybeSingle });
});

describe('seller-plan lead route', () => {
  it('offers booking only with a newly saved request, without exposing raw lead identity', async () => {
    const offer = { token: 'signed-short-lived-booking-capability', expiresAt: '2026-10-28T19:00:00Z' };
    mocks.offer.mockResolvedValue(offer);
    const result = await POST(request());
    expect(result.status).toBe(201);
    expect(await result.json()).toEqual({success:true,accepted:true,duplicate:false,bookingOffer:offer});
    expect(mocks.offer).toHaveBeenCalledWith(expect.objectContaining({leadId:SAVED_LEAD_ID,agentId:'owner-site-1',site:'taz'}));
  });
  it('stores a bounded, owner-routed CMA request without property-address details', async () => {
    const response = await POST(request());
    const body = await response.json();
    const [table] = mocks.from.mock.calls[0];
    const [record] = mocks.insert.mock.calls[0];

    expect(response.status).toBe(201);
    expect(body).toEqual({ success: true, accepted: true, duplicate: false });
    expect(body).not.toHaveProperty('identity');
    expect(table).toBe('agent_site_leads');
    expect(record).toMatchObject({ agent_id: 'owner-site-1', site: 'taz', source: 'seller_plan', email: 'taylor@example.com', preferred_contact: 'email' });
    expect(record.metadata.sellerPlan.requestedContact.granted).toBe(true);
    expect(record.metadata.sellerPlan.marketingOptIn.granted).toBe(false);
    expect(record.metadata.sellerPlan.requestKind).toBe('pricing_review');
    expect(record.metadata.sellerPlan.timing).toBe('one-to-three-months');
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
    mocks.offer.mockClear();
    const [savedRecord] = mocks.insert.mock.calls[0];
    mocks.single.mockResolvedValueOnce({ data: null, error: { code: '23505', message: 'duplicate' } });
    mocks.maybeSingle.mockResolvedValueOnce({ data: { id: SAVED_LEAD_ID, funnel_id: savedRecord.funnel_id, agent_id: savedRecord.agent_id, site: savedRecord.site, metadata: savedRecord.metadata }, error: null });
    const duplicate = await POST(request());
    expect(duplicate.status).toBe(200);
    const duplicateBody = await duplicate.json();
    expect(duplicateBody).toMatchObject({ success: true, accepted: true, duplicate: true });
    expect(duplicateBody).not.toHaveProperty('identity');
    expect(duplicateBody).not.toHaveProperty('bookingOffer');
    expect(mocks.offer).not.toHaveBeenCalled();

    mocks.single.mockResolvedValueOnce({ data: null, error: { code: '23505', message: 'duplicate' } });
    mocks.maybeSingle.mockResolvedValueOnce({ data: { id: SAVED_LEAD_ID, funnel_id: savedRecord.funnel_id, agent_id: savedRecord.agent_id, site: savedRecord.site, metadata: savedRecord.metadata }, error: null });
    const changed = await POST(request({ ...validPayload, requestKind: 'seller_plan' }));
    expect(changed.status).toBe(409);
  });

  it('returns the stored identity internally for both save and idempotent replay', async () => {
    const first = await saveSellerPlanLead(validPayload, 'taz', '2026-10-19T12:00:00.000Z');
    expect(first.status).toBe('saved');
    if (first.status !== 'saved') throw new Error('Expected saved seller lead.');
    const savedRecord = mocks.insert.mock.calls.at(-1)![0] as Record<string, unknown>;
    expect(first.identity).toEqual({
      leadId: SAVED_LEAD_ID,
      funnelId: savedRecord.funnel_id,
      agentId: 'owner-site-1',
      site: 'taz',
    });
    expect(mocks.select).toHaveBeenNthCalledWith(1, 'id, funnel_id, agent_id, site');

    mocks.single.mockResolvedValueOnce({ data: null, error: { code: '23505', message: 'duplicate' } });
    mocks.maybeSingle.mockResolvedValueOnce({ data: { id: SAVED_LEAD_ID, funnel_id: savedRecord.funnel_id, agent_id: savedRecord.agent_id, site: savedRecord.site, metadata: savedRecord.metadata }, error: null });
    const replay = await saveSellerPlanLead(validPayload, 'taz', '2026-10-19T12:05:00.000Z');
    expect(replay).toEqual({ status: 'replayed', identity: first.identity });
    expect(mocks.select).toHaveBeenLastCalledWith('id, funnel_id, agent_id, site, metadata');
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
