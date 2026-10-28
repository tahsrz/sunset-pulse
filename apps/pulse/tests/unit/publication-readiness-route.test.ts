import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { publicationCatalog, unavailablePublication } from '@/lib/marketing/publicationReadiness';
const mocks = vi.hoisted(() => ({ access: vi.fn(), load: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('@/lib/core/routeAuth', () => ({ requireOperatorRouteAccess: mocks.access, isAuthResponse: (value: unknown) => value instanceof Response }));
vi.mock('@/lib/marketing/publicationReadiness.server', () => ({ loadPublicationReadiness: mocks.load }));
import { GET } from '@/app/api/admin/marketing/readiness/route';
const request = () => new NextRequest('https://sunsetpulse.app/api/admin/marketing/readiness');
const access = (role: string) => ({ allowed: true, mode: 'authenticated', user: { id: 'fixture', role, email: 'fixture@example.test' } });
beforeEach(() => {
  vi.clearAllMocks(); vi.stubEnv('OPERATOR_EMAIL', ''); vi.stubEnv('AUTHORIZED_EMAIL', '');
  mocks.load.mockReturnValue({ checkedAt: '2026-10-28T12:00:00.000Z', items: publicationCatalog.map(item => unavailablePublication(item.key)) });
});
afterEach(() => vi.unstubAllEnvs());

describe('global publication readiness authorization', () => {
  it('denies anonymous reads before loading repository content', async () => {
    mocks.access.mockResolvedValue(new Response('{}', { status: 401 }));
    const response = await GET(request());
    expect(response.status).toBe(401);
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
    expect(mocks.load).not.toHaveBeenCalled();
  });
  it.each(['realtor', 'consumer'])('does not give %s accounts global content access', async role => {
    mocks.access.mockResolvedValue(access(role));
    expect((await GET(request())).status).toBe(403);
    expect(mocks.load).not.toHaveBeenCalled();
  });
  it.each(['admin', 'operator'])('allows %s access without caching', async role => {
    mocks.access.mockResolvedValue(access(role));
    const response = await GET(request());
    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
    expect(await response.json()).toEqual(mocks.load.mock.results[0].value);
  });
  it('retains explicitly configured operator-email and local development access', async () => {
    vi.stubEnv('OPERATOR_EMAIL', 'fixture@example.test');
    mocks.access.mockResolvedValue(access('realtor'));
    expect((await GET(request())).status).toBe(200);
    mocks.access.mockResolvedValue({ allowed: true, mode: 'local', user: null });
    expect((await GET(request())).status).toBe(200);
  });
  it('sanitizes unexpected aggregation failures', async () => {
    mocks.access.mockResolvedValue(access('admin'));
    mocks.load.mockImplementation(() => { throw new Error('private path and source data'); });
    const response = await GET(request());
    expect(response.status).toBe(503);
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
    expect(await response.json()).toEqual({ error: 'Content readiness could not be checked.' });
  });
});
