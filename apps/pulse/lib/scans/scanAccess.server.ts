import type { OperatorAccess } from '@/lib/core/operator_access';

export type ScanActor = {
  userId: string | null;
  mode: 'local' | 'authenticated';
  role: string;
};

export type ScanOwnerRecord = {
  ownerId: string;
  reviewerIds?: string[] | null;
};

export function isScanOwnerRecord(value: unknown): value is ScanOwnerRecord {
  return typeof value === 'object' && value !== null && 'ownerId' in value && typeof value.ownerId === 'string';
}

export function scanActorFromOperatorAccess(access: OperatorAccess): ScanActor {
  return {
    userId: access.user?.id || null,
    mode: access.mode === 'local' ? 'local' : 'authenticated',
    role: access.user?.role || access.mode,
  };
}

export function canReadScan(record: ScanOwnerRecord, actor: ScanActor) {
  if (actor.mode === 'local') return true;
  if (!actor.userId) return false;
  return record.ownerId === actor.userId || isConfiguredReviewer(actor.userId) || (record.reviewerIds || []).includes(actor.userId);
}

export function canReviewScan(record: ScanOwnerRecord, actor: ScanActor) {
  if (actor.mode === 'local') return true;
  if (!actor.userId) return false;
  return isConfiguredReviewer(actor.userId) || (record.reviewerIds || []).includes(actor.userId);
}

export function configuredScanReviewerIds() {
  return new Set((process.env.PROPERTY_SCAN_REVIEWER_IDS || '').split(',').map((value) => value.trim()).filter(Boolean));
}

function isConfiguredReviewer(userId: string) {
  return configuredScanReviewerIds().has(userId);
}
