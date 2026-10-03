import { createHash } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import {
  PropertyScanArtifactStoreError,
  writeAndVerifyPropertyScanArtifact,
  type PropertyScanArtifactStore,
} from '@/lib/scans/propertyScanArtifactStore.server';
import {
  buildPropertyScanReconstructionJobPayload,
  propertyScanReconstructionArtifactObjectKey,
  propertyScanReconstructionResultSchema,
} from '@/lib/scans/scanJobs.server';

const job = buildPropertyScanReconstructionJobPayload({
  ownerId: 'owner-fixture',
  scanId: 'scan-fixture',
  approvedManifestRevision: 3,
  approvedManifestHash: 'a'.repeat(64),
  processorVersion: 'unselected-fixture-processor',
});

function fixtureGlb() {
  const json = Buffer.from(JSON.stringify({ asset: { version: '2.0' } }), 'utf8');
  const padded = Buffer.concat([json, Buffer.alloc((4 - (json.length % 4)) % 4, 0x20)]);
  const bytes = Buffer.alloc(20 + padded.length);
  bytes.writeUInt32LE(0x46546c67, 0);
  bytes.writeUInt32LE(2, 4);
  bytes.writeUInt32LE(bytes.length, 8);
  bytes.writeUInt32LE(padded.length, 12);
  bytes.writeUInt32LE(0x4e4f534a, 16);
  padded.copy(bytes, 20);
  return bytes;
}

function receipt(bytes: Uint8Array) {
  return propertyScanReconstructionResultSchema.parse({
    schemaVersion: 1,
    ownerId: job.ownerId,
    scanId: job.scanId,
    operationKey: job.operationKey,
    inputRevision: job.approvedManifestRevision,
    inputManifestHash: job.approvedManifestHash,
    processorVersion: job.processorVersion,
    artifactId: '023789a5-27b4-4514-b2e4-88c2e508d1cc',
    artifactFormat: 'glb',
    artifactSha256: createHash('sha256').update(bytes).digest('hex'),
    artifactBytes: bytes.byteLength,
  });
}

function memoryStore(options: { mutateRead?: (bytes: Uint8Array) => Uint8Array; omitRead?: boolean } = {}) {
  const objects = new Map<string, Uint8Array>();
  const store: PropertyScanArtifactStore = {
    createIfAbsent: vi.fn(async ({ objectKey, bytes }) => {
      if (objects.has(objectKey)) return 'already_exists';
      objects.set(objectKey, Buffer.from(bytes));
      return 'created';
    }),
    read: vi.fn(async (objectKey) => {
      const bytes = objects.get(objectKey);
      if (!bytes || options.omitRead) return null;
      return options.mutateRead ? options.mutateRead(Buffer.from(bytes)) : Buffer.from(bytes);
    }),
    delete: vi.fn(async (objectKey) => { objects.delete(objectKey); }),
  };
  return { store, objects };
}

describe('worker artifact storage boundary', () => {
  it('writes privately and accepts only matching read-back bytes', async () => {
    const bytes = fixtureGlb();
    const { store, objects } = memoryStore();
    const result = await writeAndVerifyPropertyScanArtifact({ store, receipt: receipt(bytes), bytes });

    expect(store.createIfAbsent).toHaveBeenCalledWith({
      objectKey: result.objectKey,
      bytes,
      contentType: 'model/gltf-binary',
    });
    expect(store.read).toHaveBeenCalledWith(result.objectKey);
    expect(objects.has(result.objectKey)).toBe(true);
    expect(result.contentHash).toBe(createHash('sha256').update(bytes).digest('hex'));
    expect(JSON.stringify(result)).not.toMatch(/https?:\/\//);
  });

  it('does not write when the supplied bytes fail pre-storage verification', async () => {
    const bytes = fixtureGlb();
    const { store } = memoryStore();
    const altered = Buffer.from(bytes);
    altered[altered.length - 1] ^= 1;

    await expect(writeAndVerifyPropertyScanArtifact({ store, receipt: receipt(bytes), bytes: altered })).rejects.toThrow();
    expect(store.createIfAbsent).not.toHaveBeenCalled();
  });

  it('preserves a newly-created object when the store cannot read it back', async () => {
    const bytes = fixtureGlb();
    const { store, objects } = memoryStore({ omitRead: true });

    await expect(writeAndVerifyPropertyScanArtifact({ store, receipt: receipt(bytes), bytes }))
      .rejects.toMatchObject({ code: 'READBACK_MISSING' } satisfies Partial<PropertyScanArtifactStoreError>);
    expect(store.delete).not.toHaveBeenCalled();
    expect(objects.size).toBe(1);
  });

  it('preserves a written object after transient read failure and verifies it on retry', async () => {
    const bytes = fixtureGlb();
    const { store, objects } = memoryStore();
    const pinnedReceipt = receipt(bytes);
    vi.mocked(store.read).mockRejectedValueOnce(new Error('temporary store read outage'));

    await expect(writeAndVerifyPropertyScanArtifact({ store, receipt: pinnedReceipt, bytes }))
      .rejects.toMatchObject({ code: 'READBACK_FAILED' });
    expect(store.delete).not.toHaveBeenCalled();
    expect(objects.size).toBe(1);

    const retried = await writeAndVerifyPropertyScanArtifact({ store, receipt: pinnedReceipt, bytes });
    expect(store.createIfAbsent).toHaveBeenCalledTimes(2);
    expect(store.read).toHaveBeenCalledTimes(2);
    expect(retried.objectKey).toBe(propertyScanReconstructionArtifactObjectKey(pinnedReceipt));
    expect(store.delete).not.toHaveBeenCalled();
    expect(objects.size).toBe(1);
  });

  it('does not delete an object when a failed concurrent read races a successful retry', async () => {
    const bytes = fixtureGlb();
    const { store, objects } = memoryStore();
    const pinnedReceipt = receipt(bytes);
    let announceRead!: () => void;
    let failRead!: () => void;
    const firstReadStarted = new Promise<void>((resolve) => { announceRead = resolve; });
    const firstReadFailure = new Promise<void>((resolve) => { failRead = resolve; });
    let reads = 0;
    vi.mocked(store.read).mockImplementation(async (objectKey) => {
      reads += 1;
      if (reads === 1) {
        announceRead();
        await firstReadFailure;
        throw new Error('first worker read timed out');
      }
      const stored = objects.get(objectKey);
      return stored ? Buffer.from(stored) : null;
    });

    const firstAttempt = writeAndVerifyPropertyScanArtifact({ store, receipt: pinnedReceipt, bytes });
    await firstReadStarted;
    const successfulRetry = await writeAndVerifyPropertyScanArtifact({ store, receipt: pinnedReceipt, bytes });
    failRead();
    await expect(firstAttempt).rejects.toMatchObject({ code: 'READBACK_FAILED' });

    expect(successfulRetry.objectKey).toBe(propertyScanReconstructionArtifactObjectKey(pinnedReceipt));
    expect(store.delete).not.toHaveBeenCalled();
    expect(objects.size).toBe(1);
  });

  it('recovers from an ambiguous create response by verifying the existing object on retry', async () => {
    const bytes = fixtureGlb();
    const { store, objects } = memoryStore();
    const pinnedReceipt = receipt(bytes);
    const originalCreate = store.createIfAbsent;
    vi.mocked(store.createIfAbsent).mockImplementationOnce(async (input) => {
      await originalCreate(input);
      throw new Error('connection lost after object commit');
    });

    await expect(writeAndVerifyPropertyScanArtifact({ store, receipt: pinnedReceipt, bytes }))
      .rejects.toThrow('connection lost after object commit');
    const retried = await writeAndVerifyPropertyScanArtifact({ store, receipt: pinnedReceipt, bytes });

    expect(store.createIfAbsent).toHaveBeenCalledTimes(3);
    expect(retried.objectKey).toBe(propertyScanReconstructionArtifactObjectKey(pinnedReceipt));
    expect(objects.size).toBe(1);
    expect(store.delete).not.toHaveBeenCalled();
  });

  it('fails closed without deleting a mismatched object that may be observed concurrently', async () => {
    const bytes = fixtureGlb();
    const { store, objects } = memoryStore({ mutateRead: (stored) => {
      stored[stored.length - 1] ^= 1;
      return stored;
    } });

    await expect(writeAndVerifyPropertyScanArtifact({ store, receipt: receipt(bytes), bytes }))
      .rejects.toMatchObject({ code: 'READBACK_MISMATCH' });
    expect(store.delete).not.toHaveBeenCalled();
    expect(objects.size).toBe(1);
  });

  it('never deletes a pre-existing object on idempotent replay failure', async () => {
    const bytes = fixtureGlb();
    const { store, objects } = memoryStore({ mutateRead: (stored) => {
      stored[stored.length - 1] ^= 1;
      return stored;
    } });
    const key = `private/${job.operationKey}`;
    objects.set(key, Buffer.from(bytes));
    vi.mocked(store.createIfAbsent).mockResolvedValue('already_exists');
    vi.mocked(store.read).mockResolvedValueOnce(Buffer.from(bytes).fill(0));

    await expect(writeAndVerifyPropertyScanArtifact({ store, receipt: receipt(bytes), bytes }))
      .rejects.toMatchObject({ code: 'READBACK_MISMATCH' });
    expect(store.delete).not.toHaveBeenCalled();
  });
});
