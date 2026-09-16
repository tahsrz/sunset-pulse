import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

vi.mock('server-only', () => ({}));

import { appendPropertyScanAssets, createPropertyScanSession, updatePropertyScanReview } from '@/lib/scans/propertyScanStore';

const asset = {
  assetId: 'c5c1b3d2-9f6d-4f83-9fcf-6e2c0d0a1a11',
  path: 'owner/scan/asset-1.jpg',
  fileName: 'living-room.jpg',
  mimeType: 'image/jpeg',
  size: 10,
  capturedAt: null,
  uploadedAt: '2026-09-15T12:00:00.000Z',
};

describe('property scan store revision fences', () => {
  let tempDirectory = '';

  beforeEach(() => {
    tempDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'sunset-pulse-scan-'));
    vi.stubEnv('NEXT_PUBLIC_MOCK_MODE', 'true');
    vi.stubEnv('PULSE_MOCK_PROPERTY_SCAN_PATH', path.join(tempDirectory, 'sessions.json'));
    delete (globalThis as typeof globalThis & { __sunsetPulseMockPropertyScans?: unknown }).__sunsetPulseMockPropertyScans;
  });

  afterEach(() => {
    delete (globalThis as typeof globalThis & { __sunsetPulseMockPropertyScans?: unknown }).__sunsetPulseMockPropertyScans;
    vi.unstubAllEnvs();
    fs.rmSync(tempDirectory, { recursive: true, force: true });
  });

  it('allows exactly one concurrent append for a revision and rejects the loser', async () => {
    const session = await createPropertyScanSession({
      propertyAddress: '1612 Fair Oaks Drive, Westlake, TX',
      listingId: null,
      captureMode: 'photo_walkthrough',
      consent: { ownerAuthorized: true, interiorCaptureAcknowledged: true, publicListingApproval: false },
    }, 'owner-1');

    const expectedRevision = session.revision;
    const [first, second] = await Promise.all([
      appendPropertyScanAssets(session.scanId, 'owner-1', [asset], expectedRevision),
      appendPropertyScanAssets(session.scanId, 'owner-1', [{ ...asset, assetId: 'c5c1b3d2-9f6d-4f83-9fcf-6e2c0d0a1a12', path: 'owner/scan/asset-2.jpg', fileName: 'kitchen.jpg' }], expectedRevision),
    ]);

    expect([first, second].filter(Boolean)).toHaveLength(1);
    expect([first, second].find(Boolean)).toMatchObject({ revision: 2, status: 'in_review', assets: expect.any(Array) });
  });

  it('requires the exact review revision/hash and invalidates approval after a new capture', async () => {
    const session = await createPropertyScanSession({
      propertyAddress: '2021 Granada Trail, Southlake, TX',
      listingId: 'MLS-1',
      captureMode: 'guided_video',
      consent: { ownerAuthorized: true, interiorCaptureAcknowledged: true, publicListingApproval: false },
    }, 'owner-1');
    const captured = await appendPropertyScanAssets(session.scanId, 'owner-1', [asset], 1);
    if (!captured) throw new Error('expected capture append');

    const reviewRevision = captured.revision;
    const reviewManifestHash = captured.manifestHash;
    const [approved, stale] = await Promise.all([
      updatePropertyScanReview(session.scanId, 'approved', 'reviewer-1', 'Inspected.', reviewRevision, reviewManifestHash),
      updatePropertyScanReview(session.scanId, 'approved', 'reviewer-2', 'Stale.', reviewRevision, reviewManifestHash),
    ]);

    expect([approved, stale].filter(Boolean)).toHaveLength(1);
    expect(approved).toMatchObject({ status: 'approved', approvedManifestRevision: 2, approvedManifestHash: captured.manifestHash, revision: 3 });

    const changed = await appendPropertyScanAssets(session.scanId, 'owner-1', [{ ...asset, assetId: 'c5c1b3d2-9f6d-4f83-9fcf-6e2c0d0a1a12', path: 'owner/scan/asset-2.jpg', fileName: 'kitchen.jpg' }], approved!.revision);
    expect(changed).toMatchObject({ status: 'in_review', revision: 4, approvedManifestRevision: null, approvedManifestHash: null });
  });
});
