import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  requireSignedInUser: vi.fn(),
  isAuthResponse: vi.fn(),
  readPropertyScanSession: vi.fn(),
  updatePropertyScanReviewers: vi.fn(),
}));

vi.mock('@/lib/core/routeAuth', () => ({
  requireSignedInUser: mocks.requireSignedInUser,
  isAuthResponse: mocks.isAuthResponse,
}));
vi.mock('@/lib/scans/propertyScanStore', () => ({
  readPropertyScanSession: mocks.readPropertyScanSession,
  updatePropertyScanReviewers: mocks.updatePropertyScanReviewers,
}));

import { PATCH } from '@/app/api/property-scans/[scanId]/reviewers/route';

const session = {
  scanId: 'scan-reviewers',
  ownerId: 'owner-1',
  revision: 3,
  reviewerIds: ['reviewer-old'],
};

describe('property scan reviewer assignment route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isAuthResponse.mockImplementation((value) => value instanceof Response);
    mocks.requireSignedInUser.mockResolvedValue({ allowed: true, user: { id: 'owner-1' }, mode: 'user' });
    mocks.readPropertyScanSession.mockResolvedValue(session);
    mocks.updatePropertyScanReviewers.mockResolvedValue({ ...session, reviewerIds: ['reviewer-1', 'reviewer-2'], revision: 4 });
  });

  it('passes the owner scope and revision fence to the mutation', async () => {
    const response = await PATCH(
      new NextRequest('http://localhost/api/property-scans/scan-reviewers/reviewers', { method: 'PATCH', body: JSON.stringify({ reviewerIds: [' reviewer-1 ', 'reviewer-2', 'reviewer-1'], expectedRevision: 3 }) }),
      { params: Promise.resolve({ scanId: 'scan-reviewers' }) },
    );

    expect(response.status).toBe(200);
    expect(mocks.updatePropertyScanReviewers).toHaveBeenCalledWith('scan-reviewers', 'owner-1', ['reviewer-1', 'reviewer-2', 'reviewer-1'], 3);
  });

  it('rejects an invalid revision before reading or mutating the session', async () => {
    const response = await PATCH(
      new NextRequest('http://localhost/api/property-scans/scan-reviewers/reviewers', { method: 'PATCH', body: JSON.stringify({ reviewerIds: [], expectedRevision: 0 }) }),
      { params: Promise.resolve({ scanId: 'scan-reviewers' }) },
    );

    expect(response.status).toBe(400);
    expect(mocks.readPropertyScanSession).not.toHaveBeenCalled();
    expect(mocks.updatePropertyScanReviewers).not.toHaveBeenCalled();
  });

  it('does not reveal a scan that belongs to another owner', async () => {
    mocks.readPropertyScanSession.mockResolvedValue(null);
    const response = await PATCH(
      new NextRequest('http://localhost/api/property-scans/scan-reviewers/reviewers', { method: 'PATCH', body: JSON.stringify({ reviewerIds: ['reviewer-1'], expectedRevision: 3 }) }),
      { params: Promise.resolve({ scanId: 'scan-reviewers' }) },
    );

    expect(response.status).toBe(404);
    expect(mocks.updatePropertyScanReviewers).not.toHaveBeenCalled();
  });

  it('returns a conflict when the owner submits a stale revision', async () => {
    mocks.updatePropertyScanReviewers.mockResolvedValue(null);
    const response = await PATCH(
      new NextRequest('http://localhost/api/property-scans/scan-reviewers/reviewers', { method: 'PATCH', body: JSON.stringify({ reviewerIds: [], expectedRevision: 3 }) }),
      { params: Promise.resolve({ scanId: 'scan-reviewers' }) },
    );

    expect(response.status).toBe(409);
  });
});
