import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ rpc: vi.fn(), rateLimit: vi.fn(), tenant: vi.fn(), auth: vi.fn(), workspace: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { rpc: mocks.rpc } }));
vi.mock('@/lib/core/publicApiRateLimit', () => ({ applyPublicApiRateLimit: mocks.rateLimit }));
vi.mock('@/lib/sites/siteData', () => ({ getTenantSite: mocks.tenant }));
vi.mock('@/lib/core/routeAuth', () => ({ requireSignedInUser: mocks.auth, isAuthResponse: (value: unknown) => value instanceof Response }));
vi.mock('@/lib/realtor-workspace/access.server', async (load) => ({
  ...await load<typeof import('@/lib/realtor-workspace/access.server')>(),
  requirePersonalRealtorWorkspace: mocks.workspace,
}));

import { POST } from '@/app/api/buyer-requests/route';
import { GET } from '@/app/api/realtor/buyer-requests/route';

const ownerId = '11111111-1111-4111-8111-111111111111';
const requestId = '22222222-2222-4222-8222-222222222222';
const body = {
  offerKey: 'sunset-pulse-buyer-plan', offerVersion: '1', submissionId: requestId,
  name: 'Taylor Example', email: 'TAYLOR@example.test', requestedContact: true, marketingOptIn: false,
  campaign: { source: 'local-test', medium: 'direct', content: 'private@example.test' },
  journey: { mode: 'buy', buyingStage: { state: 'answered', value: 'searching' }, buyerPreferences: {
    destination: { state: 'answered', value: 'local' }, construction: { state: 'unknown' },
    representation: { state: 'answered', value: 'no' }, preApproval: 'yes',
  } },
};
const publicRequest = (data: unknown = body, headers: Record<string, string> = {}) => new Request('https://sunsetpulse.app/api/buyer-requests', {
  method: 'POST', headers: { origin: 'https://sunsetpulse.app', 'content-type': 'application/json', ...headers }, body: JSON.stringify(data),
});
const ownerRequest = (query = '') => new NextRequest(`https://sunsetpulse.app/api/realtor/buyer-requests${query}`);

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv('BUYER_REQUEST_AGENT_SITE', 'buyer-example');
  vi.stubEnv('BUYER_GUIDED_INTAKE_ENABLED', 'true');
  vi.stubEnv('ROOT_DOMAIN', 'sunsetpulse.app');
  mocks.rateLimit.mockResolvedValue(null);
  mocks.tenant.mockResolvedValue({ site: 'buyer-example', agentId: 'buyer-example-site', status: 'active', isPublished: true });
  mocks.auth.mockResolvedValue({ user: { id: ownerId } });
  mocks.workspace.mockResolvedValue({});
  mocks.rpc.mockResolvedValue({ data: 'saved', error: null });
});
afterEach(() => vi.unstubAllEnvs());

describe('guided buyer admission', () => {
  it('writes only validated buyer fields and returns no identity or booking capability', async () => {
    const response = await POST(publicRequest());
    expect(response.status).toBe(201);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(await response.json()).toEqual({ success: true, accepted: true, duplicate: false });
    expect(mocks.rateLimit).toHaveBeenCalledWith(expect.any(Request), 'guided-buyer-request', 3, 60, { requireDistributed: true });
    expect(mocks.tenant).toHaveBeenCalledExactlyOnceWith('buyer-example');
    expect(mocks.rpc).toHaveBeenCalledExactlyOnceWith('save_guided_buyer_request', {
      p_site: 'buyer-example', p_agent_id: 'buyer-example-site', p_submission_id: requestId,
      p_fingerprint: expect.stringMatching(/^[a-f0-9]{64}$/), p_name: 'Taylor Example', p_email: 'taylor@example.test',
      p_journey: body.journey, p_campaign: { source: 'local-test', medium: 'direct' }, p_marketing_opt_in: false,
    });
  });

  it('retains a normalized replay fingerprint and changes it when the search answers change', async () => {
    await POST(publicRequest());
    const fingerprint = mocks.rpc.mock.calls[0][1].p_fingerprint;
    mocks.rpc.mockResolvedValueOnce({ data: 'replayed', error: null });
    const { buyingStage, buyerPreferences, mode } = body.journey;
    const retry = await POST(publicRequest({ ...body, email: body.email.toLowerCase(), campaign: { medium: 'direct', source: 'local-test' },
      journey: { buyerPreferences, buyingStage, mode } }));
    expect(retry.status).toBe(200);
    expect(await retry.json()).toEqual({ success: true, accepted: true, duplicate: true });
    expect(mocks.rpc.mock.calls[1][1].p_fingerprint).toBe(fingerprint);
    mocks.rpc.mockResolvedValueOnce({ data: 'conflict', error: null });
    const change = { ...body, journey: { ...body.journey, buyerPreferences: { ...body.journey.buyerPreferences, preApproval: 'no' } } };
    expect((await POST(publicRequest(change))).status).toBe(409);
    expect(mocks.rpc.mock.calls[2][1].p_fingerprint).not.toBe(fingerprint);
  });

  it('rejects omitted consent, forged routing and financial amounts before saving', async () => {
    for (const input of [
      { ...body, requestedContact: false }, { ...body, site: 'elsewhere' },
      { ...body, journey: { ...body.journey, address: 'Private Address' } },
      { ...body, journey: { ...body.journey, buyerPreferences: { ...body.journey.buyerPreferences, preApproval: { state: 'yes', amount: 1234 } } } },
    ]) expect((await POST(publicRequest(input))).status).toBe(400);
    expect(mocks.tenant).not.toHaveBeenCalled();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it('rejects other origins, oversized requests and a closed rate limiter', async () => {
    expect((await POST(publicRequest(body, { origin: 'https://elsewhere.test', 'x-forwarded-host': 'elsewhere.test' }))).status).toBe(403);
    expect((await POST(publicRequest({ ...body, name: 'é'.repeat(6_001) }))).status).toBe(413);
    expect(mocks.rateLimit).not.toHaveBeenCalled();
    mocks.rateLimit.mockResolvedValueOnce(new Response(null, { status: 429 }));
    const limited = await POST(publicRequest());
    expect(limited.status).toBe(429);
    expect(limited.headers.get('cache-control')).toBe('no-store');
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it('fails closed without a configured published site and ignores honeypot submissions', async () => {
    vi.stubEnv('BUYER_REQUEST_AGENT_SITE', undefined);
    expect((await POST(publicRequest())).status).toBe(503);
    expect(mocks.tenant).not.toHaveBeenCalled();
    vi.stubEnv('BUYER_REQUEST_AGENT_SITE', 'buyer-example');
    expect((await POST(publicRequest({ ...body, company: 'Bot' }))).status).toBe(200);
    expect(mocks.tenant).not.toHaveBeenCalled();
    mocks.tenant.mockResolvedValueOnce({ site: 'buyer-example', agentId: 'buyer-example-site', status: 'active', isPublished: false });
    expect((await POST(publicRequest())).status).toBe(503);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it('leaves public intake closed with a configured site and the rollout switch off', async () => {
    vi.stubEnv('BUYER_GUIDED_INTAKE_ENABLED', undefined);
    expect((await POST(publicRequest())).status).toBe(503);
    expect(mocks.rateLimit).not.toHaveBeenCalled();
    expect(mocks.tenant).not.toHaveBeenCalled();
  });
});

describe('guided buyer owner reader', () => {
  it('requires the signed-in workspace and only forwards its actor to the owner RPC', async () => {
    mocks.rpc.mockResolvedValue({ data: [], error: null });
    expect((await GET(ownerRequest(`?actorId=${requestId}`))).status).toBe(400);
    expect(mocks.rpc).not.toHaveBeenCalled();
    const response = await GET(ownerRequest());
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(await response.json()).toEqual({ ok: true, result: [] });
    expect(mocks.workspace).toHaveBeenCalledExactlyOnceWith(ownerId);
    expect(mocks.rpc).toHaveBeenCalledExactlyOnceWith('list_owned_guided_buyer_requests', { p_actor_id: ownerId, p_request_id: null });
  });

  it('rejects anonymous access and hides the existence of a foreign request', async () => {
    mocks.auth.mockResolvedValueOnce(new Response(null, { status: 401 }));
    expect((await GET(ownerRequest())).status).toBe(401);
    expect(mocks.rpc).not.toHaveBeenCalled();
    mocks.rpc.mockResolvedValue({ data: [], error: null });
    expect((await GET(ownerRequest(`?requestId=${requestId}`))).status).toBe(404);
  });

  it('returns the signed-in owner’s bounded contact and journey projection', async () => {
    const row = {
      id: requestId, site: 'buyer-example', name: 'Taylor Example', email: 'taylor@example.test', journey: body.journey,
      createdAt: '2026-11-05T12:00:00+00:00', requestedContactAt: '2026-11-05T12:00:00+00:00', marketingOptIn: false,
    };
    mocks.rpc.mockResolvedValue({ data: [row], error: null });
    const result = await GET(ownerRequest(`?requestId=${requestId}`));
    expect(result.status).toBe(200);
    expect(await result.json()).toEqual({ ok: true, result: [row] });
    expect((await GET(ownerRequest(`?requestId=${ownerId}`))).status).toBe(404);
  });
});
