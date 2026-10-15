import 'server-only';

import { createHash } from 'node:crypto';
import { z } from 'zod';

const reconstructionRequestSchema = z.object({
  ownerId: z.string().trim().min(1).max(128),
  scanId: z.string().trim().min(1).max(160),
  approvedManifestRevision: z.number().int().positive(),
  approvedManifestHash: z.string().regex(/^[a-f0-9]{64}$/),
  processorVersion: z.string().trim().min(1).max(120),
}).strict();

const reconstructionResultFields = z.object({
  schemaVersion: z.literal(1),
  ownerId: z.string().trim().min(1).max(128),
  scanId: z.string().trim().min(1).max(160),
  operationKey: z.string().regex(/^scan-op-[a-f0-9]{64}$/),
  inputRevision: z.number().int().positive(),
  inputManifestHash: z.string().regex(/^[a-f0-9]{64}$/),
  processorVersion: z.string().trim().min(1).max(120),
  artifactId: z.string().uuid(),
  artifactFormat: z.literal('glb'),
  artifactSha256: z.string().regex(/^[a-f0-9]{64}$/),
  artifactBytes: z.number().int().positive().safe(),
}).strict();

export type PropertyScanReconstructionRequest = z.infer<typeof reconstructionRequestSchema>;

export const propertyScanReconstructionJobPayloadSchema = reconstructionRequestSchema.extend({
  operationKey: z.string().regex(/^scan-op-[a-f0-9]{64}$/),
}).strict();

export type PropertyScanReconstructionJobPayload = z.infer<typeof propertyScanReconstructionJobPayloadSchema>;

/** A private worker receipt, not a publication or access grant. */
export const propertyScanReconstructionResultSchema = reconstructionResultFields.superRefine((result, context) => {
  const expectedOperationKey = propertyScanReconstructionOperationKey({
    ownerId: result.ownerId,
    scanId: result.scanId,
    approvedManifestRevision: result.inputRevision,
    approvedManifestHash: result.inputManifestHash,
    processorVersion: result.processorVersion,
  });
  if (result.operationKey !== expectedOperationKey) {
    context.addIssue({ code: 'custom', path: ['operationKey'], message: 'Operation identity does not match the frozen input.' });
  }
});

export type PropertyScanReconstructionResult = z.infer<typeof propertyScanReconstructionResultSchema>;

/** Stable private object key; never a public or signed URL. */
export function propertyScanReconstructionArtifactObjectKey(result: PropertyScanReconstructionResult) {
  const parsed = propertyScanReconstructionResultSchema.parse(result);
  const ownerNamespace = createHash('sha256').update(parsed.ownerId, 'utf8').digest('hex').slice(0, 32);
  const scanNamespace = createHash('sha256').update(parsed.scanId, 'utf8').digest('hex').slice(0, 32);
  return `private/property-scans/${ownerNamespace}/${scanNamespace}/${parsed.operationKey}/${parsed.artifactId}.glb`;
}

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
  const parsed = reconstructionRequestSchema.parse({
    ownerId: input.ownerId,
    scanId: input.scanId,
    approvedManifestRevision: input.approvedManifestRevision,
    approvedManifestHash: input.approvedManifestHash,
    processorVersion: input.processorVersion,
  });
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
  const parsed = reconstructionRequestSchema.parse({
    ownerId: input.ownerId,
    scanId: input.scanId,
    approvedManifestRevision: input.approvedManifestRevision,
    approvedManifestHash: input.approvedManifestHash,
    processorVersion: input.processorVersion,
  });
  return propertyScanReconstructionJobPayloadSchema.parse({
    ...parsed,
    operationKey: propertyScanReconstructionOperationKey(parsed),
  });
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
