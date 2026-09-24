import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  requireOperatorRouteAccess: vi.fn(),
  isAuthResponse: vi.fn(),
  readPropertyScanSessionForActor: vi.fn(),
  createSignedUrl: vi.fn(),
  from: vi.fn(),
}));

vi.mock('@/lib/core/routeAuth', () => ({
  requireOperatorRouteAccess: mocks.requireOperatorRouteAccess,
  isAuthResponse: mocks.isAuthResponse,
}));
vi.mock('@/lib/scans/propertyScanStore', () => ({
  readPropertyScanSessionForActor: mocks.readPropertyScanSessionForActor,
}));
vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: { storage: { from: mocks.from } },
}));

import { GET } from '@/app/api/admin/property-scans/[scanId]/assets/[assetId]/preview/route';

describe('property scan asset preview route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
    mocks.isAuthResponse.mockImplementation((value) => value instanceof Response);
    mocks.requireOperatorRouteAccess.mockResolvedValue({ allowed: true, mode: 'local' });
    mocks.readPropertyScanSessionForActor.mockResolvedValue({
      scanId: 'scan_1',
      ownerId: 'owner-1',
      reviewerIds: [],
      assets: [{ assetId: '11111111-1111-4111-8111-111111111111', path: 'owner-1/scan_1/capture.jpg', mimeType: 'image/jpeg' }],
    });
    mocks.createSignedUrl.mockResolvedValue({ data: { signedUrl: 'https://storage.example/signed' }, error: null });
    mocks.from.mockReturnValue({ createSignedUrl: mocks.createSignedUrl });
  });

  afterEach(() => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  });

  it('signs only the resolved private asset path for a short-lived preview', async () => {
    const response = await GET(
      new NextRequest('http://localhost/api/admin/property-scans/scan_1/assets/11111111-1111-4111-8111-111111111111/preview'),
      { params: Promise.resolve({ scanId: 'scan_1', assetId: '11111111-1111-4111-8111-111111111111' }) },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.url).toBe('https://storage.example/signed');
    expect(mocks.from).toHaveBeenCalledWith('property-scans');
    expect(mocks.createSignedUrl).toHaveBeenCalledWith('owner-1/scan_1/capture.jpg', 60);
    expect(response.headers.get('cache-control')).toBe('private, no-store');
  });

  it('does not sign an unknown asset id', async () => {
    const response = await GET(
      new NextRequest('http://localhost/api/property-scans/scan_1/assets/unknown/preview'),
      { params: Promise.resolve({ scanId: 'scan_1', assetId: '22222222-2222-4222-8222-222222222222' }) },
    );

    expect(response.status).toBe(404);
    expect(mocks.createSignedUrl).not.toHaveBeenCalled();
  });
});
