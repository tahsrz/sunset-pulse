import { createHash, randomUUID } from 'node:crypto';

export type PropertyScanConsentReceipt = {
  actorId: string;
  policyVersion: string;
  acceptedAt: string;
};

export type PropertyScanReviewEvent = {
  eventId: string;
  status: 'in_review' | 'approved' | 'rejected';
  reviewerId: string;
  note: string | null;
  revision: number;
  manifestHash: string;
  createdAt: string;
};

export type PropertyScanArtifactReference = {
  artifactId: string;
  inputRevision: number;
  inputManifestHash: string;
  status: 'current' | 'stale' | 'revoked';
  createdAt: string;
};

type ManifestAsset = {
  assetId?: string;
  path: string;
  fileName: string;
  mimeType: string;
  size: number;
  contentHash?: string;
  capturedAt?: string | null;
  uploadedAt?: string | null;
};

export function propertyScanManifestHash(assets: ManifestAsset[]) {
  const canonical = assets
    .map((asset) => ({
      assetId: asset.assetId || null,
      path: asset.path,
      fileName: asset.fileName,
      mimeType: asset.mimeType,
      size: asset.size,
      contentHash: asset.contentHash || null,
      capturedAt: asset.capturedAt || null,
      uploadedAt: asset.uploadedAt || null,
    }))
    .sort((left, right) => String(left.assetId || left.path).localeCompare(String(right.assetId || right.path)));
  return createHash('sha256').update(JSON.stringify(canonical)).digest('hex');
}

export function createConsentReceipt(actorId: string, acceptedAt = new Date().toISOString()): PropertyScanConsentReceipt {
  return { actorId, policyVersion: 'property-scan-consent-v1', acceptedAt };
}

export function createReviewEvent(input: Omit<PropertyScanReviewEvent, 'eventId' | 'createdAt'>, createdAt = new Date().toISOString()): PropertyScanReviewEvent {
  return { ...input, eventId: randomUUID(), createdAt };
}

export function isCurrentScanArtifact(input: { inputRevision: number; inputManifestHash: string }, current: { revision: number; manifestHash: string; approvedManifestRevision: number | null; approvedManifestHash: string | null }) {
  return current.approvedManifestRevision === input.inputRevision
    && current.approvedManifestHash === input.inputManifestHash
    && current.manifestHash === input.inputManifestHash
    && current.revision >= input.inputRevision;
}
