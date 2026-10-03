import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { createLocalPropertyScanArtifactStore } from '@/lib/scans/localPropertyScanArtifactStore.server';
import { writeAndVerifyPropertyScanArtifact } from '@/lib/scans/propertyScanArtifactStore.server';
import {
  buildPropertyScanReconstructionJobPayload,
  propertyScanReconstructionArtifactObjectKey,
  propertyScanReconstructionResultSchema,
} from '@/lib/scans/scanJobs.server';

const roots: string[] = [];
const MAX_TEST_OBJECT_BYTES = 1024 * 1024;
const job = buildPropertyScanReconstructionJobPayload({
  ownerId: 'local-store-owner',
  scanId: 'local-store-scan',
  approvedManifestRevision: 1,
  approvedManifestHash: 'b'.repeat(64),
  processorVersion: 'local-test-processor',
});

async function createRoot() {
  const root = await mkdtemp(join(tmpdir(), 'pulse-scan-artifact-'));
  roots.push(root);
  return root;
}

function artifact() {
  const json = Buffer.from(JSON.stringify({ asset: { version: '2.0' } }), 'utf8');
  const padded = Buffer.concat([json, Buffer.alloc((4 - json.length % 4) % 4, 0x20)]);
  const bytes = Buffer.alloc(20 + padded.length);
  bytes.writeUInt32LE(0x46546c67, 0);
  bytes.writeUInt32LE(2, 4);
  bytes.writeUInt32LE(bytes.length, 8);
  bytes.writeUInt32LE(padded.length, 12);
  bytes.writeUInt32LE(0x4e4f534a, 16);
  padded.copy(bytes, 20);
  const receipt = propertyScanReconstructionResultSchema.parse({
    schemaVersion: 1,
    ownerId: job.ownerId,
    scanId: job.scanId,
    operationKey: job.operationKey,
    inputRevision: job.approvedManifestRevision,
    inputManifestHash: job.approvedManifestHash,
    processorVersion: job.processorVersion,
    artifactId: '123e4567-e89b-42d3-a456-426614174000',
    artifactFormat: 'glb',
    artifactSha256: createHash('sha256').update(bytes).digest('hex'),
    artifactBytes: bytes.byteLength,
  });
  return { bytes, receipt };
}

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe('local private property-scan artifact store', () => {
  it('uses an isolated root and supports verified write/read-back and idempotent create', async () => {
    const root = await createRoot();
    const store = createLocalPropertyScanArtifactStore(root, { maxObjectBytes: MAX_TEST_OBJECT_BYTES });
    const { bytes, receipt } = await artifact();
    const verified = await writeAndVerifyPropertyScanArtifact({ store, receipt, bytes });
    const repeated = await store.createIfAbsent({
      objectKey: verified.objectKey,
      bytes: Buffer.from('replacement'),
      contentType: 'model/gltf-binary',
    });

    expect(repeated).toBe('already_exists');
    expect(await store.read(verified.objectKey)).toEqual(bytes);
    expect(await readFile(join(root, ...verified.objectKey.split('/')))).toEqual(bytes);
  });

  it('atomically publishes complete bytes when create-if-absent calls race', async () => {
    const store = createLocalPropertyScanArtifactStore(await createRoot(), { maxObjectBytes: MAX_TEST_OBJECT_BYTES });
    const { bytes, receipt } = await artifact();
    const objectKey = propertyScanReconstructionArtifactObjectKey(receipt);

    const results = await Promise.all([
      store.createIfAbsent({ objectKey, bytes, contentType: 'model/gltf-binary' }),
      store.createIfAbsent({ objectKey, bytes, contentType: 'model/gltf-binary' }),
    ]);

    expect(results.sort()).toEqual(['already_exists', 'created']);
    expect(await store.read(objectKey)).toEqual(bytes);
  });

  it('rejects relative roots and object keys outside the derived private namespace', async () => {
    expect(() => createLocalPropertyScanArtifactStore('relative/path', { maxObjectBytes: MAX_TEST_OBJECT_BYTES })).toThrow(/absolute/);
    expect(() => createLocalPropertyScanArtifactStore(join(tmpdir(), 'unused'), { maxObjectBytes: 0 })).toThrow(/maximum object size/);
    const store = createLocalPropertyScanArtifactStore(await createRoot(), { maxObjectBytes: MAX_TEST_OBJECT_BYTES });
    await expect(store.read('../../secrets.txt')).rejects.toThrow(/namespace/);
    await expect(store.delete('private/property-scans/../../secrets.txt')).rejects.toThrow(/namespace/);
  });

  it('removes only the addressed private artifact and treats repeated deletion as safe', async () => {
    const store = createLocalPropertyScanArtifactStore(await createRoot(), { maxObjectBytes: MAX_TEST_OBJECT_BYTES });
    const { bytes, receipt } = await artifact();
    const verified = await writeAndVerifyPropertyScanArtifact({ store, receipt, bytes });
    await store.delete(verified.objectKey);
    await store.delete(verified.objectKey);

    expect(await store.read(verified.objectKey)).toBeNull();
  });

  it('enforces the configured object-size budget before writing', async () => {
    const { bytes, receipt } = await artifact();
    const store = createLocalPropertyScanArtifactStore(await createRoot(), { maxObjectBytes: bytes.byteLength - 1 });

    await expect(writeAndVerifyPropertyScanArtifact({ store, receipt, bytes })).rejects.toThrow(/object limit/);
  });
});
