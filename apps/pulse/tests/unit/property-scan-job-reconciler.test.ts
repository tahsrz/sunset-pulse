import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

vi.mock('server-only', () => ({}));

import { appendPropertyScanAssets, createPropertyScanSession, persistPropertyScanReconstructionIntent, projectPropertyScanReconstructionResult, resolvePropertyScanReconstructionIntent, updatePropertyScanReview } from '@/lib/scans/propertyScanStore';
import { reconcilePropertyScanReconstructionIntents } from '@/lib/scans/scanJobReconciler.server';
import { propertyScanReconstructionResultSchema } from '@/lib/scans/scanJobs.server';

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

  it('validates worker receipts against deterministic input identity and records only a private artifact reference', async () => {
    const { session, intent } = await approvedSession();
    const result = propertyScanReconstructionResultSchema.parse({
      schemaVersion: 1,
      ownerId: 'owner-1',
      scanId: session.scanId,
      operationKey: intent.operationKey,
      inputRevision: intent.approvedManifestRevision,
      inputManifestHash: intent.approvedManifestHash,
      processorVersion: intent.processorVersion,
      artifactId: '0b952ed0-1db9-4a41-934e-016916472066',
      artifactFormat: 'glb',
      artifactSha256: 'b'.repeat(64),
      artifactBytes: 1024,
    });
    expect(() => propertyScanReconstructionResultSchema.parse({ ...result, operationKey: `scan-op-${'0'.repeat(64)}` })).toThrow();
    expect(await projectPropertyScanReconstructionResult(result)).toBeNull();

    expect(await resolvePropertyScanReconstructionIntent(session.scanId, intent.operationKey, 'acknowledged', 'scheduler-job-1')).toBe(true);
    const projected = await projectPropertyScanReconstructionResult(result);
    expect(projected?.outcome).toBe('projected');
    expect(projected?.session.artifactRefs).toEqual([expect.objectContaining({
      artifactId: result.artifactId,
      inputRevision: result.inputRevision,
      inputManifestHash: result.inputManifestHash,
      operationKey: result.operationKey,
      processorVersion: result.processorVersion,
      artifactFormat: 'glb',
      contentHash: result.artifactSha256,
      sizeBytes: 1024,
      status: 'current',
    })]);
    expect(JSON.stringify(projected?.session.artifactRefs)).not.toContain('objectKey');

    const replay = await projectPropertyScanReconstructionResult(result);
    expect(replay?.outcome).toBe('replayed');
    expect(replay?.session.revision).toBe(projected?.session.revision);
  });

  it('rejects a stale approval and a conflicting replay for the same operation', async () => {
    const { session, intent } = await approvedSession();
    await resolvePropertyScanReconstructionIntent(session.scanId, intent.operationKey, 'acknowledged', 'scheduler-job-2');
    const result = propertyScanReconstructionResultSchema.parse({
      schemaVersion: 1,
      ownerId: 'owner-1',
      scanId: session.scanId,
      operationKey: intent.operationKey,
      inputRevision: intent.approvedManifestRevision,
      inputManifestHash: intent.approvedManifestHash,
      processorVersion: intent.processorVersion,
      artifactId: 'a037691d-8d62-41c6-bfad-8bb6f256d2b5',
      artifactFormat: 'glb',
      artifactSha256: 'c'.repeat(64),
      artifactBytes: 2048,
    });
    expect((await projectPropertyScanReconstructionResult(result))?.outcome).toBe('projected');
    const conflictingReceipt = { ...result, artifactId: '330ff59e-7d41-49ea-b4ea-fca80b08a091' };
    expect(await projectPropertyScanReconstructionResult(conflictingReceipt)).toBeNull();

    const afterUpload = await appendPropertyScanAssets(session.scanId, 'owner-1', [{ ...asset, assetId: 'e6753179-98a3-47d9-a052-5a50b074a5f1', path: 'owner-1/scan/asset-2.jpg' }], (await projectPropertyScanReconstructionResult(result))!.session.revision);
    expect(afterUpload).not.toBeNull();
    expect(await projectPropertyScanReconstructionResult(result)).toMatchObject({ outcome: 'replayed', session: { artifactRefs: [expect.objectContaining({ status: 'stale' })] } });
    expect((await projectPropertyScanReconstructionResult({ ...result, artifactId: '1401f385-cb4b-4ed9-8d28-b8c6fdb12cf6' }))).toBeNull();
  });

  it('does not project a result after the approved manifest has been superseded', async () => {
    const { session, intent } = await approvedSession();
    await resolvePropertyScanReconstructionIntent(session.scanId, intent.operationKey, 'acknowledged', 'scheduler-job-3');
    const superseded = await appendPropertyScanAssets(session.scanId, 'owner-1', [{ ...asset, assetId: 'f7254f28-299e-4c62-9c3a-a5521848b6a5', path: 'owner-1/scan/asset-2.jpg' }], session.revision);
    expect(superseded).not.toBeNull();
    const result = {
      schemaVersion: 1 as const,
      ownerId: 'owner-1',
      scanId: session.scanId,
      operationKey: intent.operationKey,
      inputRevision: intent.approvedManifestRevision,
      inputManifestHash: intent.approvedManifestHash,
      processorVersion: intent.processorVersion,
      artifactId: '5bf9119e-b3c3-4c7d-8ae9-194e323dad53',
      artifactFormat: 'glb' as const,
      artifactSha256: 'd'.repeat(64),
      artifactBytes: 4096,
    };
    expect(await projectPropertyScanReconstructionResult(result)).toBeNull();
  });
});
