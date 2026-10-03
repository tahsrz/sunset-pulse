import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';

vi.mock('server-only', () => ({}));

import {
  PropertyScanArtifactIntegrityError,
  verifyPropertyScanArtifactBytes,
} from '@/lib/scans/propertyScanArtifactIntegrity.server';
import {
  buildPropertyScanReconstructionJobPayload,
  propertyScanReconstructionResultSchema,
} from '@/lib/scans/scanJobs.server';

const job = buildPropertyScanReconstructionJobPayload({
  ownerId: 'owner-fixture',
  scanId: 'scan-fixture',
  approvedManifestRevision: 3,
  approvedManifestHash: 'a'.repeat(64),
  processorVersion: 'unselected-fixture-processor',
});

function glbBytes(assetVersion = '2.0') {
  const json = Buffer.from(JSON.stringify({ asset: { version: assetVersion }, scene: 0, scenes: [{ nodes: [] }], nodes: [] }), 'utf8');
  const padding = (4 - (json.length % 4)) % 4;
  const jsonChunk = Buffer.concat([json, Buffer.alloc(padding, 0x20)]);
  const bytes = Buffer.alloc(20 + jsonChunk.length);
  bytes.writeUInt32LE(0x46546c67, 0);
  bytes.writeUInt32LE(2, 4);
  bytes.writeUInt32LE(bytes.length, 8);
  bytes.writeUInt32LE(jsonChunk.length, 12);
  bytes.writeUInt32LE(0x4e4f534a, 16);
  jsonChunk.copy(bytes, 20);
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

describe('private reconstruction artifact byte verification', () => {
  it('returns only a deterministic private key and verified bytes metadata for a matching GLB v2 receipt', () => {
    const bytes = glbBytes();
    const verified = verifyPropertyScanArtifactBytes(receipt(bytes), bytes);
    expect(verified).toMatchObject({
      objectKey: expect.stringMatching(/^private\/property-scans\/[a-f0-9]{32}\/[a-f0-9]{32}\/scan-op-[a-f0-9]{64}\/023789a5-27b4-4514-b2e4-88c2e508d1cc\.glb$/),
      contentHash: createHash('sha256').update(bytes).digest('hex'),
      sizeBytes: bytes.byteLength,
      format: 'glb',
    });
    expect(verified.objectKey).not.toContain(job.ownerId);
    expect(verified.objectKey).not.toContain(job.scanId);
  });

  it('rejects byte counts that differ from the pinned receipt', () => {
    const bytes = glbBytes();
    expectIntegrityFailure(() => verifyPropertyScanArtifactBytes(receipt(bytes), bytes.subarray(0, bytes.length - 4)), 'SIZE_MISMATCH');
  });

  it('rejects same-length bytes whose digest differs from the pinned receipt', () => {
    const bytes = glbBytes();
    const changed = Buffer.from(bytes);
    changed[changed.length - 1] = 0x09; // Valid JSON padding, changed content.
    expectIntegrityFailure(() => verifyPropertyScanArtifactBytes(receipt(bytes), changed), 'HASH_MISMATCH');
  });

  it('rejects malformed GLB headers and non-v2 JSON assets', () => {
    const invalidMagic = glbBytes();
    invalidMagic.writeUInt32LE(0, 0);
    expectIntegrityFailure(() => verifyPropertyScanArtifactBytes(receipt(invalidMagic), invalidMagic), 'INVALID_GLB_HEADER');

    const invalidLength = glbBytes();
    invalidLength.writeUInt32LE(invalidLength.length + 4, 8);
    expectIntegrityFailure(() => verifyPropertyScanArtifactBytes(receipt(invalidLength), invalidLength), 'INVALID_GLB_HEADER');

    const invalidJson = glbBytes('1.0');
    expectIntegrityFailure(() => verifyPropertyScanArtifactBytes(receipt(invalidJson), invalidJson), 'INVALID_GLB_JSON');
  });

  it('rejects a matching but malformed worker receipt before examining bytes', () => {
    const bytes = glbBytes();
    const invalid = { ...receipt(bytes), operationKey: `scan-op-${'0'.repeat(64)}` };
    expect(() => verifyPropertyScanArtifactBytes(invalid, bytes)).toThrow();
  });
});

function expectIntegrityFailure(action: () => unknown, code: PropertyScanArtifactIntegrityError['code']) {
  try {
    action();
    throw new Error('Expected artifact verification to fail.');
  } catch (error) {
    expect(error).toBeInstanceOf(PropertyScanArtifactIntegrityError);
    expect(error).toMatchObject({ code });
  }
}
