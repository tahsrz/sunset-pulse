import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  requireOperatorRouteAccess: vi.fn(),
  isAuthResponse: vi.fn(),
  operatorAuditUser: vi.fn(),
  readPropertyScanSessionForActor: vi.fn(),
  updatePropertyScanReview: vi.fn(),
  canReviewScan: vi.fn(),
  scanActorFromOperatorAccess: vi.fn(),
}));

vi.mock('@/lib/core/routeAuth', () => ({
  requireOperatorRouteAccess: mocks.requireOperatorRouteAccess,
  isAuthResponse: mocks.isAuthResponse,
  operatorAuditUser: mocks.operatorAuditUser,
}));
vi.mock('@/lib/scans/scanAccess.server', () => ({
  canReviewScan: mocks.canReviewScan,
  scanActorFromOperatorAccess: mocks.scanActorFromOperatorAccess,
}));
vi.mock('@/lib/scans/propertyScanStore', () => ({
  readPropertyScanSessionForActor: mocks.readPropertyScanSessionForActor,
  updatePropertyScanReview: mocks.updatePropertyScanReview,
}));

import { PATCH } from '@/app/api/admin/property-scans/[scanId]/route';

const session = {
  scanId: 'scan-review',
  status: 'in_review',
  revision: 4,
  manifestHash: 'a'.repeat(64),
  assets: [{ assetId: 'asset-1' }],
};

describe('property scan review route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isAuthResponse.mockImplementation((value) => value instanceof Response);
    mocks.requireOperatorRouteAccess.mockResolvedValue({ allowed: true, mode: 'local', user: { id: 'reviewer-1' } });
    mocks.scanActorFromOperatorAccess.mockReturnValue({ mode: 'local', userId: 'reviewer-1' });
    mocks.readPropertyScanSessionForActor.mockResolvedValue(session);
    mocks.canReviewScan.mockReturnValue(true);
    mocks.operatorAuditUser.mockReturnValue({ userId: 'reviewer-1' });
    mocks.updatePropertyScanReview.mockResolvedValue({ ...session, status: 'approved', revision: 5 });
  });

  it('rejects a review payload without the exact revision and manifest hash', async () => {
    const response = await PATCH(
      new NextRequest('http://localhost/api/admin/property-scans/scan-review', { method: 'PATCH', body: JSON.stringify({ status: 'approved' }) }),
      { params: Promise.resolve({ scanId: 'scan-review' }) },
    );

    expect(response.status).toBe(400);
    expect(mocks.updatePropertyScanReview).not.toHaveBeenCalled();
  });

  it('passes the revision/hash fence to the atomic review mutation', async () => {
    const response = await PATCH(
      new NextRequest('http://localhost/api/admin/property-scans/scan-review', { method: 'PATCH', body: JSON.stringify({ status: 'approved', reviewNote: 'Inspected capture.', expectedRevision: 4, expectedManifestHash: 'a'.repeat(64), mediaInspectionAcknowledged: true }) }),
      { params: Promise.resolve({ scanId: 'scan-review' }) },
    );

    expect(response.status).toBe(200);
    expect(mocks.updatePropertyScanReview).toHaveBeenCalledWith('scan-review', 'approved', 'reviewer-1', 'Inspected capture.', 4, 'a'.repeat(64));
  });

  it('requires an explicit media inspection acknowledgement for approval', async () => {
    const response = await PATCH(
      new NextRequest('http://localhost/api/admin/property-scans/scan-review', { method: 'PATCH', body: JSON.stringify({ status: 'approved', expectedRevision: 4, expectedManifestHash: 'a'.repeat(64) }) }),
      { params: Promise.resolve({ scanId: 'scan-review' }) },
    );

    expect(response.status).toBe(400);
    expect(mocks.updatePropertyScanReview).not.toHaveBeenCalled();
  });

  it('turns a stale concurrent mutation into a conflict', async () => {
    mocks.updatePropertyScanReview.mockResolvedValue(null);
    const response = await PATCH(
      new NextRequest('http://localhost/api/admin/property-scans/scan-review', { method: 'PATCH', body: JSON.stringify({ status: 'rejected', reviewNote: 'Recapture needed.', expectedRevision: 4, expectedManifestHash: 'a'.repeat(64) }) }),
      { params: Promise.resolve({ scanId: 'scan-review' }) },
    );

    expect(response.status).toBe(409);
  });
});
