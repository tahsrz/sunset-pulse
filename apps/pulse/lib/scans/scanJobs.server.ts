import 'server-only';

import { createHash } from 'node:crypto';
import { z } from 'zod';

const reconstructionRequestSchema = z.object({
  ownerId: z.string().trim().min(1).max(128),
  scanId: z.string().trim().min(1).max(160),
  approvedManifestRevision: z.number().int().positive(),
  approvedManifestHash: z.string().regex(/^[a-f0-9]{64}$/),
  processorVersion: z.string().trim().min(1).max(120),
});

export type PropertyScanReconstructionRequest = z.infer<typeof reconstructionRequestSchema>;

export type PropertyScanReconstructionJobPayload = PropertyScanReconstructionRequest & {
  operationKey: string;
};

export type PropertyScanReconstructionIntent = PropertyScanReconstructionJobPayload & {
  eventKey: string;
  state: 'pending' | 'acknowledged' | 'stale' | 'cancelled';
  schedulerJobId: string | null;
  createdAt: string;
  updatedAt: string;
  acknowledgedAt: string | null;
  lastError: string | null;
};

/**
 * Builds the immutable identity for one approved input and processor version.
 * The key intentionally excludes wall-clock values and random IDs so a retry
 * after a Mongo/Postgres crash targets the same logical operation.
 */
export function propertyScanReconstructionOperationKey(input: PropertyScanReconstructionRequest) {
  const parsed = reconstructionRequestSchema.parse(input);
  const canonical = [
    parsed.ownerId,
    parsed.scanId,
    String(parsed.approvedManifestRevision),
    parsed.approvedManifestHash,
    parsed.processorVersion,
  ].join(':');
  return `scan-op-${createHash('sha256').update(canonical, 'utf8').digest('hex')}`;
}

export function propertyScanReconstructionEventKey(input: PropertyScanReconstructionRequest) {
  return `property-scan-reconstruction:${propertyScanReconstructionOperationKey(input)}`;
}

export function buildPropertyScanReconstructionJobPayload(input: PropertyScanReconstructionRequest): PropertyScanReconstructionJobPayload {
  const parsed = reconstructionRequestSchema.parse(input);
  return {
    ...parsed,
    operationKey: propertyScanReconstructionOperationKey(parsed),
  };
}

export function buildPropertyScanReconstructionIntent(input: PropertyScanReconstructionRequest, now = new Date().toISOString()): PropertyScanReconstructionIntent {
  const payload = buildPropertyScanReconstructionJobPayload(input);
  return {
    ...payload,
    eventKey: propertyScanReconstructionEventKey(payload),
    state: 'pending',
    schedulerJobId: null,
    createdAt: now,
    updatedAt: now,
    acknowledgedAt: null,
    lastError: null,
  };
}
