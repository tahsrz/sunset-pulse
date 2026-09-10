import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
const mocks = vi.hoisted(() => ({ connect: vi.fn(), read: vi.fn(), initialize: vi.fn(), publish: vi.fn(), disable: vi.fn() }));
vi.mock('@/lib/core/database', () => ({ default: mocks.connect }));
vi.mock('@/lib/core/routeAuth', () => ({ requireOperatorRouteAccess: vi.fn(async () => ({ allowed: true })), isAuthResponse: vi.fn(() => false), operatorAuditUser: vi.fn(() => ({ userId: 'operator' })) }));
vi.mock('@/lib/cms/pages/platformHomepageService', () => ({ readPlatformHomepageEditor: mocks.read, initializePlatformHomepage: mocks.initialize, publishPlatformHomepage: mocks.publish, disablePlatformHomepage: mocks.disable }));
vi.mock('@/lib/sites/siteUrls', () => ({ getJamieGuideUrl: () => 'https://jamie.sunsetpulse.app/' }));
import { GET, POST } from '@/app/api/platform-homepage/route';
const post = (body: unknown) => POST(new NextRequest('http://localhost/api/platform-homepage', { method: 'POST', body: JSON.stringify(body) }));

describe('platform homepage operator API', () => {
  beforeEach(() => { vi.resetAllMocks(); mocks.read.mockResolvedValue({ binding: null, page: null }); });
  it('returns an explicit uninitialized state without provisioning on GET', async () => {
    const response = await GET(new NextRequest('http://localhost/api/platform-homepage'));
    expect(await response.json()).toEqual({ binding: null, page: null });
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(mocks.initialize).not.toHaveBeenCalled();
  });
  it('initializes only on an explicit action and uses the operator identity', async () => {
    expect((await post({ action: 'initialize' })).status).toBe(200);
    expect(mocks.initialize).toHaveBeenCalledWith({ actorId: 'operator', jamieUrl: 'https://jamie.sunsetpulse.app/' });
  });
  it('publishes with both the draft and homepage binding versions', async () => {
    expect((await post({ action: 'publish', expectedVersion: 2, expectedBindingVersion: 4 })).status).toBe(200);
    expect(mocks.publish).toHaveBeenCalledWith({ action: 'publish', actorId: 'operator', expectedVersion: 2, expectedBindingVersion: 4 });
  });
  it('rejects a missing version before connecting', async () => {
    expect((await post({ action: 'publish', expectedVersion: 2 })).status).toBe(400);
    expect(mocks.connect).not.toHaveBeenCalled();
  });
  it('reports a stale pointer as a conflict and does not report success', async () => {
    mocks.publish.mockRejectedValue(new Error('PLATFORM_HOMEPAGE_CONFLICT'));
    expect((await post({ action: 'publish', expectedVersion: 2, expectedBindingVersion: 4 })).status).toBe(409);
    expect(mocks.read).not.toHaveBeenCalled();
  });
  it('disables through the dedicated binding operation', async () => {
    expect((await post({ action: 'disable', expectedBindingVersion: 4 })).status).toBe(200);
    expect(mocks.disable).toHaveBeenCalledWith({ action: 'disable', actorId: 'operator', expectedBindingVersion: 4 });
  });
});
