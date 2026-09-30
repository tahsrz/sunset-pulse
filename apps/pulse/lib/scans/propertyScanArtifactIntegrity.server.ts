import 'server-only';

import { createHash } from 'node:crypto';
import {
  propertyScanReconstructionArtifactObjectKey,
  propertyScanReconstructionResultSchema,
  type PropertyScanReconstructionResult,
} from './scanJobs.server';

export type PropertyScanArtifactIntegrityFailure =
  | 'SIZE_MISMATCH'
  | 'HASH_MISMATCH'
  | 'INVALID_GLB_HEADER'
  | 'INVALID_GLB_JSON';

export class PropertyScanArtifactIntegrityError extends Error {
  constructor(public readonly code: PropertyScanArtifactIntegrityFailure) {
    super('Reconstruction artifact failed integrity verification.');
    this.name = 'PropertyScanArtifactIntegrityError';
  }
}

export type VerifiedPropertyScanArtifactBytes = {
  objectKey: string;
  contentHash: string;
  sizeBytes: number;
  format: 'glb';
};

/**
 * Verify bytes before a worker writes them to private storage. This validates
 * the GLB v2 container header and JSON asset version, not full glTF semantics.
 */
export function verifyPropertyScanArtifactBytes(
  receipt: PropertyScanReconstructionResult,
  bytes: Uint8Array,
): VerifiedPropertyScanArtifactBytes {
  const result = propertyScanReconstructionResultSchema.parse(receipt);
  if (bytes.byteLength !== result.artifactBytes) throw new PropertyScanArtifactIntegrityError('SIZE_MISMATCH');

  const contentHash = createHash('sha256').update(bytes).digest('hex');
  if (contentHash !== result.artifactSha256) throw new PropertyScanArtifactIntegrityError('HASH_MISMATCH');

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (bytes.byteLength < 20
    || view.getUint32(0, true) !== 0x46546c67
    || view.getUint32(4, true) !== 2
    || view.getUint32(8, true) !== bytes.byteLength) {
    throw new PropertyScanArtifactIntegrityError('INVALID_GLB_HEADER');
  }

  const jsonChunkLength = view.getUint32(12, true);
  const jsonChunkType = view.getUint32(16, true);
  if (jsonChunkType !== 0x4e4f534a || jsonChunkLength === 0 || jsonChunkLength % 4 !== 0 || 20 + jsonChunkLength > bytes.byteLength) {
    throw new PropertyScanArtifactIntegrityError('INVALID_GLB_HEADER');
  }

  try {
    const jsonChunk = new TextDecoder('utf-8', { fatal: true }).decode(bytes.subarray(20, 20 + jsonChunkLength)).trimEnd();
    const document = JSON.parse(jsonChunk);
    if (document?.asset?.version !== '2.0') throw new Error('Unexpected glTF asset version.');
  } catch {
    throw new PropertyScanArtifactIntegrityError('INVALID_GLB_JSON');
  }

  return {
    objectKey: propertyScanReconstructionArtifactObjectKey(result),
    contentHash,
    sizeBytes: bytes.byteLength,
    format: 'glb',
  };
}
