import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import {
  buildPropertyScanReconstructionJobPayload,
  propertyScanReconstructionEventKey,
  propertyScanReconstructionOperationKey,
} from '@/lib/scans/scanJobs.server';
import { createPropertyScanSession, persistPropertyScanReconstructionIntent, updatePropertyScanReview, appendPropertyScanAssets } from '@/lib/scans/propertyScanStore';

const input = {
  ownerId: 'owner-1',
  scanId: 'scan_123',
  approvedManifestRevision: 4,
  approvedManifestHash: 'a'.repeat(64),
  processorVersion: 'unavailable-v1',
};

describe('property scan reconstruction job identity', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_MOCK_MODE', 'true');
    delete (globalThis as typeof globalThis & { __sunsetPulseMockPropertyScans?: unknown }).__sunsetPulseMockPropertyScans;
  });

  it('is stable across retries and changes when the approved input changes', () => {
    const first = propertyScanReconstructionOperationKey(input);
    expect(propertyScanReconstructionOperationKey({ ...input })).toBe(first);
    expect(propertyScanReconstructionOperationKey({ ...input, approvedManifestRevision: 5 })).not.toBe(first);
    expect(propertyScanReconstructionOperationKey({ ...input, processorVersion: 'processor-v2' })).not.toBe(first);
    expect(first).toMatch(/^scan-op-[a-f0-9]{64}$/);
  });

  it('creates a bounded event identity and freezes the request metadata', () => {
    const payload = buildPropertyScanReconstructionJobPayload(input);
    expect(payload).toEqual({ ...input, operationKey: propertyScanReconstructionOperationKey(input) });
    expect(propertyScanReconstructionEventKey(input)).toBe(`property-scan-reconstruction:${payload.operationKey}`);
    expect(propertyScanReconstructionEventKey(input).length).toBeLessThanOrEqual(240);
  });

  it('rejects malformed manifest hashes before any enqueue layer can use them', () => {
    expect(() => buildPropertyScanReconstructionJobPayload({ ...input, approvedManifestHash: 'not-a-hash' })).toThrow();
  });

  it('persists one bounded intent and reuses it for duplicate requests', async () => {
    const session = await createPropertyScanSession({
      propertyAddress: '1612 Fair Oaks Drive, Westlake, TX',
      listingId: null,
      captureMode: 'photo_walkthrough',
      consent: { ownerAuthorized: true, interiorCaptureAcknowledged: true, publicListingApproval: false },
    }, 'owner-1');
    const captured = await appendPropertyScanAssets(session.scanId, 'owner-1', [{
      assetId: 'c5c1b3d2-9f6d-4f83-9fcf-6e2c0d0a1a11',
      path: 'owner-1/scan/asset.jpg',
      fileName: 'asset.jpg',
      mimeType: 'image/jpeg',
      size: 10,
      capturedAt: null,
      uploadedAt: new Date().toISOString(),
    }], session.revision);
    if (!captured) throw new Error('capture append failed');
    const approved = await updatePropertyScanReview(session.scanId, 'approved', 'reviewer-1', 'Inspected.', captured.revision, captured.manifestHash);
    if (!approved) throw new Error('review failed');

    const first = await persistPropertyScanReconstructionIntent(session.scanId, 'owner-1', 'unavailable-v1');
    const second = await persistPropertyScanReconstructionIntent(session.scanId, 'owner-1', 'unavailable-v1');
    expect(first).toMatchObject({ reused: false, intent: { state: 'pending', approvedManifestRevision: captured.revision } });
    expect(second).toMatchObject({ reused: true, intent: { operationKey: first!.intent.operationKey } });
    expect(second!.session.reconstructionIntents).toHaveLength(1);
  });
});
