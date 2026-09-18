import 'server-only';

import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { createHash } from 'node:crypto';
import connectDB from '@/lib/core/database';
import { PropertyScanSession } from '@/models/PropertyScanSession';
import { propertyScanAssetLimits, type PropertyScanAsset, type PropertyScanRequest } from '@/lib/scans/propertyScanContract';
import { reconstructionUnavailable, type PropertyScanReconstruction, type ReconstructionUnavailable } from '@/lib/scans/reconstruction';
import { buildPropertyScanReconstructionIntent, type PropertyScanReconstructionIntent } from '@/lib/scans/scanJobs.server';
import { canReadScan, configuredScanReviewerIds, isScanOwnerRecord, type ScanActor } from './scanAccess.server';
import { createConsentReceipt, createReviewEvent, isCurrentScanArtifact, propertyScanManifestHash, type PropertyScanArtifactReference, type PropertyScanConsentReceipt, type PropertyScanReviewEvent } from './propertyScanVersioning';
import { resolveOwnerPropertyScanListing } from './propertyScanListingResolution.server';

export type PropertyScanSessionRecord = PropertyScanRequest & {
  scanId: string;
  ownerId: string;
  listingLinkStatus: 'unresolved' | 'verified';
  shortlistEntryId: string | null;
  status: 'capture_ready' | 'in_review' | 'approved' | 'rejected';
  reviewNote: string | null;
  reviewedAt: string | null;
  reviewedBy: string | null;
  reviewerIds: string[];
  schemaVersion: number;
  revision: number;
  manifestHash: string;
  consentReceipt: PropertyScanConsentReceipt | null;
  approvedManifestRevision: number | null;
  approvedManifestHash: string | null;
  reviewEvents: PropertyScanReviewEvent[];
  artifactRefs: PropertyScanArtifactReference[];
  reconstructionIntents: PropertyScanReconstructionIntent[];
  uploadReservations: PropertyScanUploadReservation[];
  reconstruction: PropertyScanReconstruction | null;
  assets: PropertyScanAsset[];
  createdAt: string;
  updatedAt: string;
};

export type PropertyScanUploadReservation = {
  uploadId: string;
  idempotencyKey: string;
  fileName: string;
  mimeType: string;
  declaredBytes: number;
  expectedRevision: number;
  state: 'pending' | 'finalized' | 'aborted' | 'expired';
  assetId: string | null;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
};

export type PropertyScanUploadReservationInput = {
  idempotencyKey: string;
  fileName: string;
  mimeType: string;
  declaredBytes: number;
  expectedRevision: number;
};

export type PropertyScanUploadCleanupTarget = {
  scanId: string;
  ownerId: string;
  uploadId: string;
  fileName: string;
  mimeType: string;
};

export type PendingPropertyScanReconstructionIntent = {
  scanId: string;
  intent: PropertyScanReconstructionIntent;
};

export async function createPropertyScanSession(input: PropertyScanRequest, ownerId: string) {
  if (isMockMode()) return createMockSession(input, ownerId);

  await connectDB();
  const listingResolution = await resolveOwnerPropertyScanListing(ownerId, input);
  const record = await PropertyScanSession.create({
    scanId: `scan_${randomUUID()}`,
    ownerId,
    ...input,
    listingLinkStatus: listingResolution.listingLinkStatus,
    shortlistEntryId: listingResolution.shortlistEntryId,
    status: 'capture_ready',
    schemaVersion: 2,
    revision: 1,
    manifestHash: propertyScanManifestHash([]),
    consentReceipt: createConsentReceipt(ownerId),
    approvedManifestRevision: null,
    approvedManifestHash: null,
    reviewEvents: [],
    artifactRefs: [],
    reconstructionIntents: [],
    assets: [],
  });
  return serialize(record);
}

export async function listPropertyScanSessions(ownerId: string) {
  if (isMockMode()) return [...getMockSessions().values()]
    .filter((session) => session.ownerId === ownerId)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .map(serialize);

  await connectDB();
  const records = await PropertyScanSession.find({ ownerId }).sort({ updatedAt: -1 }).limit(50).lean();
  return records.map(serialize);
}

export async function listPropertyScanSessionsForActor(actor: ScanActor, limit = 50) {
  if (isMockMode()) {
    return [...getMockSessions().values()]
      .filter((session) => canReadScan(session, actor))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, limit)
      .map(serialize);
  }

  await connectDB();
  const scope = scanActorQuery(actor);
  const records = await PropertyScanSession.find(scope).sort({ updatedAt: -1, scanId: -1 }).limit(Math.min(Math.max(limit, 1), 100)).lean();
  return records.filter((record) => isScanOwnerRecord(record) && canReadScan(record, actor)).map(serialize);
}

export async function readPropertyScanSessionForActor(scanId: string, actor: ScanActor) {
  if (isMockMode()) {
    const record = getMockSessions().get(scanId);
    return record && canReadScan(record, actor) ? serialize(record) : null;
  }

  await connectDB();
  const scope = { scanId, ...scanActorQuery(actor) };
  const record = await PropertyScanSession.findOne(scope).lean();
  return record && isScanOwnerRecord(record) && canReadScan(record, actor) ? serialize(record) : null;
}

export async function listAllPropertyScanSessions() {
  if (isMockMode()) return [...getMockSessions().values()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).map(serialize);

  await connectDB();
  const records = await PropertyScanSession.find({}).sort({ updatedAt: -1 }).limit(100).lean();
  return records.map(serialize);
}

export async function readPropertyScanSession(scanId: string, ownerId: string) {
  if (isMockMode()) {
    const record = getMockSessions().get(scanId);
    return record?.ownerId === ownerId ? serialize(record) : null;
  }

  await connectDB();
  const record = await PropertyScanSession.findOne({ scanId, ownerId }).lean();
  return record ? serialize(record) : null;
}

export async function appendPropertyScanAssets(scanId: string, ownerId: string, assets: PropertyScanAsset[], expectedRevision: number) {
  const uniqueAssets = assets.filter((asset, index, all) => asset.assetId && all.findIndex((candidate) => candidate.assetId === asset.assetId) === index);
  if (!uniqueAssets.length || uniqueAssets.length !== assets.length) return null;
  if (isMockMode()) {
    const record = getMockSessions().get(scanId);
    if (!record || record.ownerId !== ownerId || record.revision !== expectedRevision) return null;
    if (record.assets.some((asset) => uniqueAssets.some((candidate) => candidate.assetId === asset.assetId))) return null;
    record.assets = [...record.assets, ...uniqueAssets];
    record.status = 'in_review';
    record.revision += 1;
    record.manifestHash = propertyScanManifestHash(record.assets);
    record.approvedManifestRevision = null;
    record.approvedManifestHash = null;
    record.artifactRefs = record.artifactRefs.map((artifact) => ({ ...artifact, status: artifact.status === 'revoked' ? 'revoked' : 'stale' }));
    record.updatedAt = new Date().toISOString();
    persistMockSessions();
    return serialize(record);
  }

  await connectDB();
  const current = await PropertyScanSession.findOne({ scanId, ownerId, revision: expectedRevision }).lean();
  if (!current) return null;
  const currentRecord = current as unknown as { assets?: PropertyScanAsset[] };
  const currentAssets = Array.isArray(currentRecord.assets) ? currentRecord.assets : [];
  if (currentAssets.some((asset: any) => uniqueAssets.some((candidate) => candidate.assetId === asset.assetId))) return null;
  const nextAssets = [...currentAssets, ...uniqueAssets];
  const record = await PropertyScanSession.findOneAndUpdate(
    { scanId, ownerId, revision: expectedRevision },
    { $push: { assets: { $each: uniqueAssets.map((asset) => ({ ...asset, uploadedAt: asset.uploadedAt || new Date() })) } }, $set: { status: 'in_review', revision: expectedRevision + 1, manifestHash: propertyScanManifestHash(nextAssets), approvedManifestRevision: null, approvedManifestHash: null, 'artifactRefs.$[active].status': 'stale' } },
    { new: true, arrayFilters: [{ 'active.status': 'current' }] },
  ).lean();
  return record ? serialize(record) : null;
}

export async function reservePropertyScanUpload(
  scanId: string,
  ownerId: string,
  input: PropertyScanUploadReservationInput,
) {
  if (!isValidUploadReservationInput(input)) return null;
  const now = new Date();
  const expiresAt = new Date(now.getTime() + propertyScanAssetLimits.reservationTtlMs);
  const uploadId = deterministicUploadId(scanId, input.idempotencyKey);

  if (isMockMode()) {
    const record = getMockSessions().get(scanId);
    if (!record || record.ownerId !== ownerId || record.revision !== input.expectedRevision) return null;
    const existing = record.uploadReservations.find((reservation) => reservation.idempotencyKey === input.idempotencyKey);
    if (existing) return matchesReservation(existing, input) ? serialize(record) : null;
    if (!withinUploadQuota(record, input.declaredBytes, now)) return null;
    record.uploadReservations.push({ uploadId, ...input, state: 'pending', assetId: randomUUID(), expiresAt: expiresAt.toISOString(), createdAt: now.toISOString(), updatedAt: now.toISOString() });
    record.updatedAt = now.toISOString();
    persistMockSessions();
    return serialize(record);
  }

  await connectDB();
  const activeReservations = {
    $filter: {
      input: { $ifNull: ['$uploadReservations', []] },
      as: 'reservation',
      cond: { $and: [{ $eq: ['$$reservation.state', 'pending'] }, { $gt: ['$$reservation.expiresAt', now] }] },
    },
  };
  const assetBytes = { $reduce: { input: { $ifNull: ['$assets', []] }, initialValue: 0, in: { $add: ['$$value', '$$this.size'] } } };
  const reservationBytes = { $reduce: { input: activeReservations, initialValue: 0, in: { $add: ['$$value', '$$this.declaredBytes'] } } };
  const record = await PropertyScanSession.findOneAndUpdate(
    {
      scanId,
      ownerId,
      revision: input.expectedRevision,
      uploadReservations: { $not: { $elemMatch: { idempotencyKey: input.idempotencyKey } } },
      $expr: { $and: [
        { $lt: [{ $size: { $ifNull: ['$assets', []] } }, propertyScanAssetLimits.maxFiles] },
        { $lte: [{ $add: [assetBytes, reservationBytes, input.declaredBytes] }, propertyScanAssetLimits.maxBytesPerSession] },
        { $lt: [{ $size: activeReservations }, propertyScanAssetLimits.maxActiveUploads] },
      ] },
    },
    { $push: { uploadReservations: { uploadId, ...input, state: 'pending', assetId: randomUUID(), expiresAt, createdAt: now, updatedAt: now } }, $set: { updatedAt: now } },
    { new: true },
  ).lean();
  if (record) return serialize(record);
  const existing = await PropertyScanSession.findOne({ scanId, ownerId, 'uploadReservations.idempotencyKey': input.idempotencyKey }).lean() as any;
  return existing && existing.revision === input.expectedRevision && existing.uploadReservations?.some((reservation: any) => reservation.idempotencyKey === input.idempotencyKey && matchesReservation(reservation, input))
    ? serialize(existing)
    : null;
}

export async function finalizePropertyScanUpload(
  scanId: string,
  ownerId: string,
  uploadId: string,
  asset: PropertyScanAsset,
  expectedRevision: number,
) {
  if (!asset.assetId || !propertyScanAssetLimits.maxFiles || asset.size > propertyScanAssetLimits.maxBytesPerFile) return null;
  if (isMockMode()) {
    const record = getMockSessions().get(scanId);
    if (!record || record.ownerId !== ownerId) return null;
    const reservation = record.uploadReservations.find((candidate) => candidate.uploadId === uploadId);
    if (!reservation || reservation.expectedRevision !== expectedRevision) return null;
    if (reservation.state === 'finalized') return serialize(record);
    if (reservation.state !== 'pending' || reservation.expiresAt <= new Date().toISOString() || asset.assetId !== reservation.assetId || asset.size !== reservation.declaredBytes || record.revision !== expectedRevision || !withinUploadQuota(record, asset.size, new Date(), true)) return null;
    const now = new Date().toISOString();
    reservation.state = 'finalized'; reservation.assetId = asset.assetId; reservation.updatedAt = now;
    record.assets.push({ ...asset, uploadedAt: asset.uploadedAt || now });
    record.status = 'in_review'; record.revision += 1; record.manifestHash = propertyScanManifestHash(record.assets); record.approvedManifestRevision = null; record.approvedManifestHash = null;
    record.artifactRefs = record.artifactRefs.map((artifact) => ({ ...artifact, status: artifact.status === 'revoked' ? 'revoked' : 'stale' })); record.updatedAt = now; persistMockSessions();
    return serialize(record);
  }

  await connectDB();
  const current = await PropertyScanSession.findOne({ scanId, ownerId, 'uploadReservations.uploadId': uploadId }).lean() as any;
  if (!current) return null;
  const reservation = current.uploadReservations?.find((candidate: any) => candidate.uploadId === uploadId);
  if (!reservation) return null;
  if (reservation.state === 'finalized') return serialize(current);
  if (current.revision !== expectedRevision || reservation.state !== 'pending' || new Date(reservation.expiresAt).getTime() <= Date.now() || asset.assetId !== reservation.assetId || asset.size !== reservation.declaredBytes) return null;
  const currentAssets = Array.isArray(current.assets) ? current.assets : [];
  if (currentAssets.some((candidate: any) => candidate.assetId === asset.assetId)) return null;
  const nextAssets = [...currentAssets, asset];
  const record = await PropertyScanSession.findOneAndUpdate(
    { scanId, ownerId, revision: expectedRevision, 'uploadReservations': { $elemMatch: { uploadId, state: 'pending', expiresAt: { $gt: new Date() }, declaredBytes: asset.size } } },
    { $push: { assets: { ...asset, uploadedAt: asset.uploadedAt || new Date() } }, $set: { status: 'in_review', revision: expectedRevision + 1, manifestHash: propertyScanManifestHash(nextAssets), approvedManifestRevision: null, approvedManifestHash: null, 'uploadReservations.$[reservation].state': 'finalized', 'uploadReservations.$[reservation].assetId': asset.assetId, 'uploadReservations.$[reservation].updatedAt': new Date(), 'artifactRefs.$[active].status': 'stale' } },
    { new: true, arrayFilters: [{ 'reservation.uploadId': uploadId, 'reservation.state': 'pending' }, { 'active.status': 'current' }] },
  ).lean();
  return record ? serialize(record) : null;
}

export async function abortPropertyScanUpload(scanId: string, ownerId: string, uploadId: string) {
  const now = new Date();
  if (isMockMode()) {
    const record = getMockSessions().get(scanId);
    const reservation = record?.ownerId === ownerId ? record.uploadReservations.find((candidate) => candidate.uploadId === uploadId) : null;
    if (!record || !reservation) return null;
    if (reservation.state === 'pending') { reservation.state = 'aborted'; reservation.updatedAt = now.toISOString(); record.updatedAt = now.toISOString(); persistMockSessions(); }
    return serialize(record);
  }
  await connectDB();
  const record = await PropertyScanSession.findOneAndUpdate({ scanId, ownerId, 'uploadReservations.uploadId': uploadId }, { $set: { 'uploadReservations.$[reservation].state': 'aborted', 'uploadReservations.$[reservation].updatedAt': now, updatedAt: now } }, { new: true, arrayFilters: [{ 'reservation.uploadId': uploadId, 'reservation.state': 'pending' }] }).lean();
  return record ? serialize(record) : null;
}

export async function expirePropertyScanUploadReservations(now = new Date()) {
  const targets = await listExpiredPropertyScanUploadReservations(now, Number.MAX_SAFE_INTEGER);
  let changed = 0;
  for (const target of targets) if (await markPropertyScanUploadReservationExpired(target, now)) changed += 1;
  return changed;
}

export async function listExpiredPropertyScanUploadReservations(now = new Date(), limit = 50): Promise<PropertyScanUploadCleanupTarget[]> {
  const boundedLimit = Math.min(Math.max(Math.trunc(limit), 1), 100);
  if (isMockMode()) {
    const targets: PropertyScanUploadCleanupTarget[] = [];
    for (const record of getMockSessions().values()) {
      for (const reservation of record.uploadReservations) {
        if (reservation.state !== 'pending' || new Date(reservation.expiresAt).getTime() > now.getTime()) continue;
        targets.push({ scanId: record.scanId, ownerId: record.ownerId, uploadId: reservation.uploadId, fileName: reservation.fileName, mimeType: reservation.mimeType });
        if (targets.length >= boundedLimit) return targets;
      }
    }
    return targets;
  }

  await connectDB();
  const records = await PropertyScanSession.find({ uploadReservations: { $elemMatch: { state: 'pending', expiresAt: { $lte: now } } } })
    .select('scanId ownerId uploadReservations')
    .sort({ scanId: 1 })
    .limit(boundedLimit)
    .lean();
  return records.flatMap((record: any) => (record.uploadReservations || [])
    .filter((reservation: any) => reservation.state === 'pending' && new Date(reservation.expiresAt).getTime() <= now.getTime())
    .map((reservation: any) => ({ scanId: record.scanId, ownerId: record.ownerId, uploadId: reservation.uploadId, fileName: reservation.fileName, mimeType: reservation.mimeType })))
    .slice(0, boundedLimit);
}

export async function markPropertyScanUploadReservationExpired(target: PropertyScanUploadCleanupTarget, now = new Date()) {
  if (isMockMode()) {
    const record = getMockSessions().get(target.scanId);
    const reservation = record?.ownerId === target.ownerId ? record.uploadReservations.find((candidate) => candidate.uploadId === target.uploadId && candidate.state === 'pending') : null;
    if (!record || !reservation || new Date(reservation.expiresAt).getTime() > now.getTime()) return false;
    reservation.state = 'expired';
    reservation.updatedAt = now.toISOString();
    record.updatedAt = now.toISOString();
    persistMockSessions();
    return true;
  }
  await connectDB();
  const result = await PropertyScanSession.updateOne(
    { scanId: target.scanId, ownerId: target.ownerId, uploadReservations: { $elemMatch: { uploadId: target.uploadId, state: 'pending', expiresAt: { $lte: now } } } },
    { $set: { 'uploadReservations.$[expired].state': 'expired', 'uploadReservations.$[expired].updatedAt': now, updatedAt: now } },
    { arrayFilters: [{ 'expired.uploadId': target.uploadId, 'expired.state': 'pending', 'expired.expiresAt': { $lte: now } }] },
  );
  return result.modifiedCount > 0;
}

export async function updatePropertyScanReview(
  scanId: string,
  status: 'in_review' | 'approved' | 'rejected',
  reviewer: string,
  reviewNote: string | null,
  expectedRevision: number,
  expectedManifestHash: string,
) {
  if (isMockMode()) {
    const record = getMockSessions().get(scanId);
    if (!record || record.revision !== expectedRevision || record.manifestHash !== expectedManifestHash) return null;
    if (status === 'approved' && (!record.consentReceipt || record.assets.length === 0)) return null;
    const reviewedAt = new Date().toISOString();
    record.reviewEvents.push(createReviewEvent({ status, reviewerId: reviewer, note: reviewNote, revision: record.revision, manifestHash: record.manifestHash }, reviewedAt));
    record.status = status;
    record.reviewNote = reviewNote;
    record.reviewedBy = reviewer;
    record.reviewedAt = reviewedAt;
    record.approvedManifestRevision = status === 'approved' ? record.revision : null;
    record.approvedManifestHash = status === 'approved' ? record.manifestHash : null;
    if (status !== 'approved') record.artifactRefs = record.artifactRefs.map((artifact) => ({ ...artifact, status: artifact.status === 'revoked' ? 'revoked' : 'stale' }));
    record.revision += 1;
    record.updatedAt = record.reviewedAt;
    persistMockSessions();
    return serialize(record);
  }

  await connectDB();
  const current = await PropertyScanSession.findOne({ scanId, revision: expectedRevision, manifestHash: expectedManifestHash }).lean();
  const currentRecord = current as unknown as { consentReceipt?: { actorId?: string }; assets?: unknown[] } | null;
  if (!currentRecord || (status === 'approved' && (!currentRecord.consentReceipt?.actorId || !currentRecord.assets?.length))) return null;
  const reviewedAt = new Date();
  const event = createReviewEvent({ status, reviewerId: reviewer, note: reviewNote, revision: expectedRevision, manifestHash: expectedManifestHash }, reviewedAt.toISOString());
  const record = await PropertyScanSession.findOneAndUpdate(
    { scanId, revision: expectedRevision, manifestHash: expectedManifestHash },
    {
      $set: { status, reviewNote, reviewedBy: reviewer, reviewedAt, revision: expectedRevision + 1, approvedManifestRevision: status === 'approved' ? expectedRevision : null, approvedManifestHash: status === 'approved' ? expectedManifestHash : null, ...(status !== 'approved' ? { 'artifactRefs.$[active].status': 'stale' } : {}) },
      $push: { reviewEvents: event },
    },
    { new: true, ...(status !== 'approved' ? { arrayFilters: [{ 'active.status': 'current' }] } : {}) },
  ).lean();
  return record ? serialize(record) : null;
}

export async function updatePropertyScanReviewers(
  scanId: string,
  ownerId: string,
  reviewerIds: string[],
  expectedRevision: number,
) {
  const normalizedReviewerIds = [...new Set(reviewerIds.map((id) => id.trim()).filter(Boolean))];
  if (normalizedReviewerIds.length > 20 || normalizedReviewerIds.some((id) => id.length > 128)) return null;

  if (isMockMode()) {
    const record = getMockSessions().get(scanId);
    if (!record || record.ownerId !== ownerId || record.revision !== expectedRevision) return null;
    record.reviewerIds = normalizedReviewerIds;
    record.revision += 1;
    record.updatedAt = new Date().toISOString();
    persistMockSessions();
    return serialize(record);
  }

  await connectDB();
  const record = await PropertyScanSession.findOneAndUpdate(
    { scanId, ownerId, revision: expectedRevision },
    { $set: { reviewerIds: normalizedReviewerIds, revision: expectedRevision + 1 } },
    { new: true, runValidators: true },
  ).lean();
  return record ? serialize(record) : null;
}

export async function startPropertyScanReconstruction(scanId: string): Promise<PropertyScanSessionRecord | ReconstructionUnavailable | null> {
  if (isMockMode()) {
    const record = getMockSessions().get(scanId);
    if (!record || record.status !== 'approved' || !record.assets.length || !record.approvedManifestHash || record.approvedManifestHash !== record.manifestHash) return null;
    return reconstructionUnavailable;
  }

  await connectDB();
  const existing = await PropertyScanSession.findOne({ scanId, status: 'approved', 'assets.0': { $exists: true }, approvedManifestHash: { $exists: true, $ne: null }, $expr: { $eq: ['$approvedManifestHash', '$manifestHash'] } }).lean();
  if (!existing) return null;
  return reconstructionUnavailable;
}

/**
 * Persist the cross-store handoff record only. A separate reconciler will
 * enqueue the matching Postgres event after rechecking this frozen approval.
 * This intentionally does not claim that a processor accepted the work.
 */
export async function persistPropertyScanReconstructionIntent(
  scanId: string,
  ownerId: string,
  processorVersion: string,
) {
  if (isMockMode()) {
    const record = getMockSessions().get(scanId);
    if (!record || record.ownerId !== ownerId || record.status !== 'approved' || !record.approvedManifestRevision || !record.approvedManifestHash) return null;
    const intent = buildPropertyScanReconstructionIntent({ ownerId, scanId, approvedManifestRevision: record.approvedManifestRevision, approvedManifestHash: record.approvedManifestHash, processorVersion });
    const existing = record.reconstructionIntents.find((candidate) => candidate.operationKey === intent.operationKey);
    if (existing) return { session: serialize(record), intent: existing, reused: true };
    if (record.reconstructionIntents.length >= 20) return null;
    record.reconstructionIntents.push(intent);
    record.updatedAt = intent.updatedAt;
    persistMockSessions();
    return { session: serialize(record), intent, reused: false };
  }

  await connectDB();
  const current = await PropertyScanSession.findOne({ scanId, ownerId, status: 'approved', approvedManifestRevision: { $ne: null }, approvedManifestHash: { $ne: null }, $expr: { $eq: ['$approvedManifestHash', '$manifestHash'] } }).lean() as any;
  if (!current) return null;
  const intent = buildPropertyScanReconstructionIntent({ ownerId, scanId, approvedManifestRevision: current.approvedManifestRevision, approvedManifestHash: current.approvedManifestHash, processorVersion });
  const mongoIntent = { ...intent, createdAt: new Date(intent.createdAt), updatedAt: new Date(intent.updatedAt) };
  const record = await PropertyScanSession.findOneAndUpdate(
    { scanId, ownerId, status: 'approved', approvedManifestRevision: intent.approvedManifestRevision, approvedManifestHash: intent.approvedManifestHash, $expr: { $eq: ['$approvedManifestHash', '$manifestHash'] }, $or: [{ 'reconstructionIntents.operationKey': intent.operationKey }, { 'reconstructionIntents': { $exists: false } }, { $expr: { $lt: [{ $size: { $ifNull: ['$reconstructionIntents', []] } }, 20] } }] },
    [
      {
        $set: {
          reconstructionIntents: {
            $let: {
              vars: { existing: { $ifNull: ['$reconstructionIntents', []] } },
              in: {
                $cond: [
                  { $in: [intent.operationKey, { $map: { input: '$$existing', as: 'candidate', in: '$$candidate.operationKey' } }] },
                  '$$existing',
                  { $concatArrays: ['$$existing', [mongoIntent]] },
                ],
              },
            },
          },
          updatedAt: new Date(intent.updatedAt),
        },
      },
    ],
    { new: true },
  ).lean() as any;
  if (!record) return null;
  const savedIntent = (record.reconstructionIntents || []).find((candidate: any) => candidate.operationKey === intent.operationKey);
  if (!savedIntent) return null;
  const serializedIntent = serializeReconstructionIntent(savedIntent);
  return { session: serialize(record), intent: serializedIntent, reused: serializedIntent.createdAt !== intent.createdAt };
}

export async function listPendingPropertyScanReconstructionIntents(limit = 25): Promise<PendingPropertyScanReconstructionIntent[]> {
  const boundedLimit = Math.min(Math.max(Math.trunc(limit), 1), 100);
  if (isMockMode()) {
    return [...getMockSessions().values()]
      .flatMap((record) => record.reconstructionIntents
        .filter((intent) => intent.state === 'pending')
        .map((intent) => ({ scanId: record.scanId, intent })))
      .slice(0, boundedLimit);
  }

  await connectDB();
  const records = await PropertyScanSession.find({ reconstructionIntents: { $elemMatch: { state: 'pending' } } })
    .select('scanId reconstructionIntents')
    .sort({ updatedAt: 1, scanId: 1 })
    .limit(boundedLimit)
    .lean() as any[];
  return records.flatMap((record) => (record.reconstructionIntents || [])
    .filter((intent: any) => intent.state === 'pending')
    .map((intent: any) => ({ scanId: record.scanId, intent: serializeReconstructionIntent(intent) })));
}

export async function resolvePropertyScanReconstructionIntent(
  scanId: string,
  operationKey: string,
  resolution: 'acknowledged' | 'stale',
  schedulerJobId: string | null = null,
) {
  const now = new Date().toISOString();
  if (isMockMode()) {
    const record = getMockSessions().get(scanId);
    const intent = record?.reconstructionIntents.find((candidate) => candidate.operationKey === operationKey && candidate.state === 'pending');
    if (!record || !intent) return false;
    intent.state = resolution;
    intent.schedulerJobId = schedulerJobId;
    intent.acknowledgedAt = resolution === 'acknowledged' ? now : null;
    intent.updatedAt = now;
    persistMockSessions();
    return true;
  }

  await connectDB();
  const record = await PropertyScanSession.findOneAndUpdate(
    { scanId, 'reconstructionIntents': { $elemMatch: { operationKey, state: 'pending' } } },
    { $set: { 'reconstructionIntents.$[intent].state': resolution, 'reconstructionIntents.$[intent].schedulerJobId': schedulerJobId, 'reconstructionIntents.$[intent].acknowledgedAt': resolution === 'acknowledged' ? new Date(now) : null, 'reconstructionIntents.$[intent].updatedAt': new Date(now) } },
    { new: true, arrayFilters: [{ 'intent.operationKey': operationKey, 'intent.state': 'pending' }] },
  ).lean();
  return Boolean(record);
}

function serializeReconstructionIntent(intent: any): PropertyScanReconstructionIntent {
  return {
    operationKey: intent.operationKey,
    eventKey: intent.eventKey,
    ownerId: intent.ownerId,
    scanId: intent.scanId,
    approvedManifestRevision: intent.approvedManifestRevision,
    approvedManifestHash: intent.approvedManifestHash,
    processorVersion: intent.processorVersion,
    state: intent.state,
    schedulerJobId: intent.schedulerJobId || null,
    createdAt: new Date(intent.createdAt).toISOString(),
    updatedAt: new Date(intent.updatedAt).toISOString(),
    acknowledgedAt: intent.acknowledgedAt ? new Date(intent.acknowledgedAt).toISOString() : null,
    lastError: intent.lastError || null,
  };
}

function serialize(record: any): PropertyScanSessionRecord {
  return {
    scanId: record.scanId,
    ownerId: record.ownerId,
    propertyAddress: record.propertyAddress,
    listingId: record.listingId || null,
    listingLinkStatus: record.listingLinkStatus === 'verified' ? 'verified' : 'unresolved',
    shortlistEntryId: typeof record.shortlistEntryId === 'string' ? record.shortlistEntryId : null,
    captureMode: record.captureMode,
    status: record.status,
    reviewNote: record.reviewNote || null,
    reviewedAt: record.reviewedAt ? new Date(record.reviewedAt).toISOString() : null,
    reviewedBy: record.reviewedBy || null,
    reviewerIds: Array.isArray(record.reviewerIds) ? record.reviewerIds : [],
    schemaVersion: Number.isInteger(record.schemaVersion) ? record.schemaVersion : 1,
    revision: Number.isInteger(record.revision) && record.revision > 0 ? record.revision : 1,
    manifestHash: typeof record.manifestHash === 'string' && record.manifestHash ? record.manifestHash : propertyScanManifestHash(record.assets || []),
    consentReceipt: record.consentReceipt?.actorId ? { actorId: record.consentReceipt.actorId, policyVersion: record.consentReceipt.policyVersion, acceptedAt: new Date(record.consentReceipt.acceptedAt).toISOString() } : null,
    approvedManifestRevision: Number.isInteger(record.approvedManifestRevision) ? record.approvedManifestRevision : null,
    approvedManifestHash: record.approvedManifestHash || null,
    reviewEvents: Array.isArray(record.reviewEvents) ? record.reviewEvents.map((event: any) => ({ eventId: event.eventId, status: event.status, reviewerId: event.reviewerId, note: event.note || null, revision: event.revision, manifestHash: event.manifestHash, createdAt: new Date(event.createdAt).toISOString() })) : [],
    artifactRefs: Array.isArray(record.artifactRefs) ? record.artifactRefs.map((artifact: any) => ({ artifactId: artifact.artifactId, inputRevision: artifact.inputRevision, inputManifestHash: artifact.inputManifestHash, status: artifact.status === 'current' && (record.status !== 'approved' || !isCurrentScanArtifact(artifact, record)) ? 'stale' : artifact.status, createdAt: new Date(artifact.createdAt).toISOString() })) : [],
    reconstructionIntents: Array.isArray(record.reconstructionIntents) ? record.reconstructionIntents.map(serializeReconstructionIntent) : [],
    uploadReservations: Array.isArray(record.uploadReservations) ? record.uploadReservations.map((reservation: any) => ({ uploadId: reservation.uploadId, idempotencyKey: reservation.idempotencyKey, fileName: reservation.fileName, mimeType: reservation.mimeType, declaredBytes: reservation.declaredBytes, expectedRevision: reservation.expectedRevision, state: reservation.state, assetId: reservation.assetId || null, expiresAt: new Date(reservation.expiresAt).toISOString(), createdAt: new Date(reservation.createdAt).toISOString(), updatedAt: new Date(reservation.updatedAt).toISOString() })) : [],
    reconstruction: record.reconstruction?.jobId ? {
      jobId: record.reconstruction.jobId,
      status: record.reconstruction.status,
      progress: record.reconstruction.progress,
      engine: record.reconstruction.engine,
      previewKind: record.reconstruction.previewKind,
      roomCount: record.reconstruction.roomCount,
      assetCount: record.reconstruction.assetCount,
      startedAt: record.reconstruction.startedAt ? new Date(record.reconstruction.startedAt).toISOString() : null,
      completedAt: record.reconstruction.completedAt ? new Date(record.reconstruction.completedAt).toISOString() : null,
      error: record.reconstruction.error || null,
    } : null,
    consent: record.consent,
    assets: (record.assets || []).map((asset: any) => ({
      assetId: asset.assetId || undefined,
      path: asset.path,
      fileName: asset.fileName,
      mimeType: asset.mimeType,
      size: asset.size,
      contentHash: asset.contentHash,
      capturedAt: asset.capturedAt ? new Date(asset.capturedAt).toISOString() : null,
      uploadedAt: asset.uploadedAt ? new Date(asset.uploadedAt).toISOString() : undefined,
    })),
    createdAt: new Date(record.createdAt).toISOString(),
    updatedAt: new Date(record.updatedAt).toISOString(),
  };
}

type MockSessionMap = Map<string, PropertyScanSessionRecord>;
type MockGlobal = typeof globalThis & { __sunsetPulseMockPropertyScans?: MockSessionMap };

function getMockSessions(): MockSessionMap {
  const globalStore = globalThis as MockGlobal;
  if (!globalStore.__sunsetPulseMockPropertyScans) {
    globalStore.__sunsetPulseMockPropertyScans = new Map([...readMockSessions()].map(([scanId, record]) => [scanId, normalizeMockRecord(record)]));
  }
  return globalStore.__sunsetPulseMockPropertyScans;
}

function createMockSession(input: PropertyScanRequest, ownerId: string) {
  const now = new Date().toISOString();
  const record: PropertyScanSessionRecord = {
    scanId: `scan_${randomUUID()}`,
    ownerId,
    ...input,
    listingLinkStatus: 'unresolved',
    shortlistEntryId: null,
    status: 'capture_ready',
    reviewNote: null,
    reviewedAt: null,
    reviewedBy: null,
    reviewerIds: [],
    schemaVersion: 2,
    revision: 1,
    manifestHash: propertyScanManifestHash([]),
    consentReceipt: createConsentReceipt(ownerId, now),
    approvedManifestRevision: null,
    approvedManifestHash: null,
    reviewEvents: [],
    artifactRefs: [],
    reconstructionIntents: [],
    uploadReservations: [],
    reconstruction: null,
    assets: [],
    createdAt: now,
    updatedAt: now,
  };
  getMockSessions().set(record.scanId, record);
  persistMockSessions();
  return serialize(record);
}

function readMockSessions(): MockSessionMap {
  const filePath = mockStorePath();
  if (!fs.existsSync(filePath)) return new Map();
  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    return new Map((Array.isArray(parsed?.sessions) ? parsed.sessions : []).map((record: PropertyScanSessionRecord) => [record.scanId, record]));
  } catch {
    return new Map();
  }
}

function normalizeMockRecord(record: PropertyScanSessionRecord): PropertyScanSessionRecord {
  return {
    ...record,
    listingLinkStatus: record.listingLinkStatus === 'verified' ? 'verified' : 'unresolved',
    shortlistEntryId: typeof record.shortlistEntryId === 'string' ? record.shortlistEntryId : null,
    schemaVersion: Number.isInteger(record.schemaVersion) ? record.schemaVersion : 1,
    revision: Number.isInteger(record.revision) && record.revision > 0 ? record.revision : 1,
    manifestHash: record.manifestHash || propertyScanManifestHash(record.assets || []),
    consentReceipt: record.consentReceipt || null,
    approvedManifestRevision: Number.isInteger(record.approvedManifestRevision) ? record.approvedManifestRevision : null,
    approvedManifestHash: record.approvedManifestHash || null,
    reviewEvents: Array.isArray(record.reviewEvents) ? record.reviewEvents : [],
    artifactRefs: Array.isArray(record.artifactRefs) ? record.artifactRefs : [],
    uploadReservations: Array.isArray(record.uploadReservations) ? record.uploadReservations : [],
    reviewerIds: Array.isArray(record.reviewerIds) ? record.reviewerIds : [],
  };
}

function persistMockSessions() {
  const filePath = mockStorePath();
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify({ sessions: [...getMockSessions().values()] }, null, 2), 'utf8');
}

function mockStorePath() {
  return process.env.PULSE_MOCK_PROPERTY_SCAN_PATH || path.join(process.cwd(), '.pulse-local', 'property_scans.json');
}

function isMockMode() {
  return process.env.NEXT_PUBLIC_MOCK_MODE === 'true';
}

function isValidUploadReservationInput(input: PropertyScanUploadReservationInput) {
  return Boolean(input.idempotencyKey.trim())
    && input.idempotencyKey.length <= 200
    && Boolean(input.fileName.trim())
    && input.fileName.length <= 255
    && Boolean(input.mimeType.trim())
    && input.mimeType.length <= 120
    && Number.isInteger(input.declaredBytes)
    && input.declaredBytes > 0
    && input.declaredBytes <= propertyScanAssetLimits.maxBytesPerFile
    && Number.isInteger(input.expectedRevision)
    && input.expectedRevision > 0;
}

function deterministicUploadId(scanId: string, idempotencyKey: string) {
  return `upload_${createHash('sha256').update(`${scanId}:${idempotencyKey}`).digest('hex').slice(0, 40)}`;
}

function matchesReservation(reservation: PropertyScanUploadReservation, input: PropertyScanUploadReservationInput) {
  return reservation.fileName === input.fileName
    && reservation.mimeType === input.mimeType
    && reservation.declaredBytes === input.declaredBytes
    && reservation.expectedRevision === input.expectedRevision;
}

function withinUploadQuota(record: PropertyScanSessionRecord, declaredBytes: number, now: Date, includeCurrentReservation = false) {
  const active = record.uploadReservations.filter((reservation) => reservation.state === 'pending' && new Date(reservation.expiresAt).getTime() > now.getTime());
  const totalBytes = record.assets.reduce((total, asset) => total + asset.size, 0)
    + active.reduce((total, reservation) => total + reservation.declaredBytes, 0)
    + (includeCurrentReservation ? 0 : declaredBytes);
  return record.assets.length < propertyScanAssetLimits.maxFiles
    && totalBytes <= propertyScanAssetLimits.maxBytesPerSession
    && active.length + (includeCurrentReservation ? 0 : 1) <= propertyScanAssetLimits.maxActiveUploads;
}

function scanActorQuery(actor: ScanActor) {
  if (actor.mode === 'local' || (actor.userId && configuredScanReviewerIds().has(actor.userId))) return {};
  return { $or: [{ ownerId: actor.userId }, ...(actor.userId ? [{ reviewerIds: actor.userId }] : [])] };
}
