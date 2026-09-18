import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

vi.mock('server-only', () => ({}));

import { appendPropertyScanAssets, createPropertyScanSession, persistPropertyScanReconstructionIntent, updatePropertyScanReview } from '@/lib/scans/propertyScanStore';
import { reconcilePropertyScanReconstructionIntents } from '@/lib/scans/scanJobReconciler.server';

const asset = {
  assetId: 'c5c1b3d2-9f6d-4f83-9fcf-6e2c0d0a1a11',
  path: 'owner-1/scan/asset.jpg',
  fileName: 'asset.jpg',
  mimeType: 'image/jpeg',
  size: 10,
  capturedAt: null,
  uploadedAt: new Date().toISOString(),
};

async function approvedSession() {
  const session = await createPropertyScanSession({
    propertyAddress: '1612 Fair Oaks Drive, Westlake, TX',
    listingId: null,
    captureMode: 'photo_walkthrough',
    consent: { ownerAuthorized: true, interiorCaptureAcknowledged: true, publicListingApproval: false },
  }, 'owner-1');
  const captured = await appendPropertyScanAssets(session.scanId, 'owner-1', [asset], session.revision);
  if (!captured) throw new Error('capture append failed');
  const approved = await updatePropertyScanReview(session.scanId, 'approved', 'reviewer-1', 'Inspected.', captured.revision, captured.manifestHash);
  if (!approved) throw new Error('review failed');
  const intent = await persistPropertyScanReconstructionIntent(session.scanId, 'owner-1', 'processor-v1');
  if (!intent) throw new Error('intent persistence failed');
  return { session: approved, intent: intent.intent };
}

describe('property scan reconstruction intent reconciliation', () => {
  let tempDirectory = '';

  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_MOCK_MODE', 'true');
    tempDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'sunset-pulse-reconciler-'));
    vi.stubEnv('PULSE_MOCK_PROPERTY_SCAN_PATH', path.join(tempDirectory, 'sessions.json'));
    delete (globalThis as typeof globalThis & { __sunsetPulseMockPropertyScans?: unknown }).__sunsetPulseMockPropertyScans;
  });

  afterEach(() => {
    delete (globalThis as typeof globalThis & { __sunsetPulseMockPropertyScans?: unknown }).__sunsetPulseMockPropertyScans;
    vi.unstubAllEnvs();
    fs.rmSync(tempDirectory, { recursive: true, force: true });
  });

  it('enqueues the frozen event and acknowledges it with the scheduler job id', async () => {
    const { session, intent } = await approvedSession();
    const enqueue = vi.fn().mockResolvedValue({ id: 'job-1' });
    const result = await reconcilePropertyScanReconstructionIntents({ enqueue });
    expect(result).toEqual({ scanned: 1, acknowledged: 1, stale: 0, retryable: 0 });
    expect(enqueue).toHaveBeenCalledWith(expect.objectContaining({ userId: 'owner-1', eventKey: intent.eventKey, workflowKey: 'property_scan_reconstruction', payloadVersion: 1 }));
    const again = await reconcilePropertyScanReconstructionIntents({ enqueue });
    expect(again.scanned).toBe(0);
    expect(session.scanId).toBe(intent.scanId);
  });

  it('marks an intent stale when the approved manifest is replaced before relay', async () => {
    const { session } = await approvedSession();
    const changed = await appendPropertyScanAssets(session.scanId, 'owner-1', [{ ...asset, assetId: 'c5c1b3d2-9f6d-4f83-9fcf-6e2c0d0a1a12', path: 'owner-1/scan/asset-2.jpg' }], session.revision);
    if (!changed) throw new Error('manifest replacement failed');
    const enqueue = vi.fn();
    const result = await reconcilePropertyScanReconstructionIntents({ enqueue });
    expect(result).toEqual({ scanned: 1, acknowledged: 0, stale: 1, retryable: 0 });
    expect(enqueue).not.toHaveBeenCalled();
  });

  it('leaves the intent pending when the scheduler enqueue is unavailable', async () => {
    await approvedSession();
    const result = await reconcilePropertyScanReconstructionIntents({ enqueue: vi.fn().mockRejectedValue(new Error('contract unavailable')) });
    expect(result).toEqual({ scanned: 1, acknowledged: 0, stale: 0, retryable: 1 });
    const retry = await reconcilePropertyScanReconstructionIntents({ enqueue: vi.fn().mockResolvedValue({ id: 'job-2' }) });
    expect(retry.acknowledged).toBe(1);
  });
});
