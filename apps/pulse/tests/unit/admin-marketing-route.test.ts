import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import config from '@/config/marketing_copy.json';

const mocks = vi.hoisted(() => ({ access: vi.fn(), load: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('@/lib/core/routeAuth', () => ({
  requireOperatorRouteAccess: mocks.access,
  isAuthResponse: (value: unknown) => value instanceof Response,
}));
vi.mock('@/lib/marketing/marketingCopy.server', () => ({ loadMarketingCopy: mocks.load }));
import { GET, POST } from '@/app/api/admin/marketing/route';

const userAccess = (role: string, email = 'person@example.com') => ({
  allowed: true, mode: 'authenticated', user: { id: 'test-user', role, email },
});
const request = (method = 'GET') => new NextRequest('https://sunsetpulse.app/api/admin/marketing', { method });
afterEach(() => vi.unstubAllEnvs());

describe('global marketing content route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('OPERATOR_EMAIL', '');
    vi.stubEnv('AUTHORIZED_EMAIL', '');
    mocks.load.mockReturnValue(config);
  });

  it.each(['GET', 'POST'])('rejects anonymous %s before loading content', async method => {
    mocks.access.mockResolvedValue(new Response('{}', { status: 403 }));
    const response = await (method === 'GET' ? GET : POST)(request(method));
    expect(response.status).toBe(403);
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
    expect(mocks.load).not.toHaveBeenCalled();
  });

  it.each(['realtor', 'consumer'])('denies global access to %s accounts', async role => {
    mocks.access.mockResolvedValue(userAccess(role));
    expect((await GET(request())).status).toBe(403);
    expect((await POST(request('POST'))).status).toBe(403);
    expect(mocks.load).not.toHaveBeenCalled();
  });

  it.each(['admin', 'operator'])('allows %s to read validated content without caching', async role => {
    mocks.access.mockResolvedValue(userAccess(role));
    const response = await GET(request());
    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
    expect(await response.json()).toEqual(config);
  });

  it.each(['OPERATOR_EMAIL', 'AUTHORIZED_EMAIL'])('honors explicitly configured %s access', async key => {
    vi.stubEnv(key, 'Owner@Example.com');
    mocks.access.mockResolvedValue(userAccess('realtor', 'owner@example.com'));
    expect((await GET(request())).status).toBe(200);
  });

  it('preserves the existing local development access decision', async () => {
    mocks.access.mockResolvedValue({ allowed: true, mode: 'local', user: null });
    expect((await GET(request())).status).toBe(200);
  });

  it('returns a sanitized unavailable response when the content loader fails', async () => {
    mocks.access.mockResolvedValue(userAccess('admin'));
    mocks.load.mockImplementation(() => { throw new Error('private filesystem details'); });
    const response = await GET(request());
    expect(response.status).toBe(500);
    expect(JSON.stringify(await response.json())).not.toContain('private filesystem');
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
  });

  it('refuses legacy publication even for admins and does not parse the submitted body', async () => {
    mocks.access.mockResolvedValue(userAccess('admin'));
    const post = request('POST');
    const readBody = vi.spyOn(post, 'json');
    const response = await POST(post);
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ code: 'MARKETING_PUBLISH_UNAVAILABLE' });
    expect(readBody).not.toHaveBeenCalled();
    expect(mocks.load).not.toHaveBeenCalled();
  });
});
