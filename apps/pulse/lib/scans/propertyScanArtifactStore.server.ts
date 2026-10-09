import 'server-only';

import {
  verifyPropertyScanArtifactBytes,
  type VerifiedPropertyScanArtifactBytes,
} from './propertyScanArtifactIntegrity.server';
import type { PropertyScanReconstructionResult } from './scanJobs.server';

export type PrivateArtifactWriteResult = 'created' | 'already_exists';

/**
 * Minimal private-object-store contract for the reconstruction worker.
 * Implementations must keep objects private and make createIfAbsent atomic.
 */
export interface PropertyScanArtifactStore {
  createIfAbsent(input: {
    objectKey: string;
    bytes: Uint8Array;
    contentType: 'model/gltf-binary';
  }): Promise<PrivateArtifactWriteResult>;
  read(objectKey: string): Promise<Uint8Array | null>;
  delete(objectKey: string): Promise<void>;
}

export class PropertyScanArtifactStoreError extends Error {
  constructor(
    public readonly code: 'READBACK_MISSING' | 'READBACK_MISMATCH' | 'READBACK_FAILED',
    options?: ErrorOptions,
  ) {
    super('Private reconstruction artifact could not be verified after storage.');
    this.name = 'PropertyScanArtifactStoreError';
    if (options?.cause) this.cause = options.cause;
  }
}

/**
 * Store and read back an artifact without exposing a URL or choosing a vendor.
 * This is deliberately not called by an active worker until storage policy and
 * an implementation of PropertyScanArtifactStore have been approved.
 */
export async function writeAndVerifyPropertyScanArtifact(input: {
  store: PropertyScanArtifactStore;
  receipt: PropertyScanReconstructionResult;
  bytes: Uint8Array;
}): Promise<VerifiedPropertyScanArtifactBytes> {
  const verified = verifyPropertyScanArtifactBytes(input.receipt, input.bytes);
  await input.store.createIfAbsent({
    objectKey: verified.objectKey,
    bytes: input.bytes,
    contentType: 'model/gltf-binary',
  });

  let storedBytes: Uint8Array | null;
  try {
    storedBytes = await input.store.read(verified.objectKey);
  } catch (cause) {
    throw new PropertyScanArtifactStoreError('READBACK_FAILED', { cause });
  }
  if (!storedBytes) {
    throw new PropertyScanArtifactStoreError('READBACK_MISSING');
  }

  try {
    const stored = verifyPropertyScanArtifactBytes(input.receipt, storedBytes);
    if (stored.objectKey !== verified.objectKey) throw new Error('Unexpected object identity.');
  } catch {
    throw new PropertyScanArtifactStoreError('READBACK_MISMATCH');
  }

  return verified;
}
