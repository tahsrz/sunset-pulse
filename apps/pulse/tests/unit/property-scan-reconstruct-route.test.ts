import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  requireOperatorRouteAccess: vi.fn(),
  isAuthResponse: vi.fn(),
  readPropertyScanSessionForActor: vi.fn(),
  startPropertyScanReconstruction: vi.fn(),
}));

vi.mock('@/lib/core/routeAuth', () => ({
  requireOperatorRouteAccess: mocks.requireOperatorRouteAccess,
  isAuthResponse: mocks.isAuthResponse,
}));
vi.mock('@/lib/scans/propertyScanStore', () => ({
  readPropertyScanSessionForActor: mocks.readPropertyScanSessionForActor,
  startPropertyScanReconstruction: mocks.startPropertyScanReconstruction,
}));

import { POST } from '@/app/api/admin/property-scans/[scanId]/reconstruct/route';

const approvedSession = {
  scanId: 'scan_approved',
  status: 'approved',
  assets: [{ fileName: 'living-room.jpg' }],
  reconstruction: null,
};

describe('property scan reconstruction route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isAuthResponse.mockImplementation((value) => value instanceof Response);
    mocks.requireOperatorRouteAccess.mockResolvedValue({ allowed: true, mode: 'local' });
    mocks.readPropertyScanSessionForActor.mockResolvedValue(approvedSession);
  });

  it('returns an explicit unavailable capability without writing a fake result', async () => {
    mocks.startPropertyScanReconstruction.mockResolvedValue({
      outcome: 'unavailable',
      code: 'PROCESSOR_UNAVAILABLE',
      message: 'A real reconstruction processor is not configured yet.',
    });

    const response = await POST(
      new NextRequest('http://localhost/api/admin/property-scans/scan_approved/reconstruct', { method: 'POST' }),
      { params: Promise.resolve({ scanId: 'scan_approved' }) },
    );
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.code).toBe('PROCESSOR_UNAVAILABLE');
    expect(mocks.startPropertyScanReconstruction).toHaveBeenCalledWith('scan_approved');
  });

  it('does not reuse a legacy synthetic demo as a property model', async () => {
    mocks.readPropertyScanSessionForActor.mockResolvedValue({
      ...approvedSession,
      reconstruction: { status: 'ready', engine: 'manifest-preview-v1', previewKind: 'procedural-room-shell' },
    });

    const response = await POST(
      new NextRequest('http://localhost/api/admin/property-scans/scan_approved/reconstruct', { method: 'POST' }),
      { params: Promise.resolve({ scanId: 'scan_approved' }) },
    );

    expect(response.status).toBe(409);
    expect((await response.json()).code).toBe('LEGACY_SYNTHETIC_DEMO');
    expect(mocks.startPropertyScanReconstruction).not.toHaveBeenCalled();
  });
});
