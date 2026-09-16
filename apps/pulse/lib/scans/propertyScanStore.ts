import 'server-only';

import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import connectDB from '@/lib/core/database';
import { PropertyScanSession } from '@/models/PropertyScanSession';
import type { PropertyScanAsset, PropertyScanRequest } from '@/lib/scans/propertyScanContract';
import { reconstructionUnavailable, type PropertyScanReconstruction, type ReconstructionUnavailable } from '@/lib/scans/reconstruction';
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
  reconstruction: PropertyScanReconstruction | null;
  assets: PropertyScanAsset[];
  createdAt: string;
  updatedAt: string;
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

function scanActorQuery(actor: ScanActor) {
  if (actor.mode === 'local' || (actor.userId && configuredScanReviewerIds().has(actor.userId))) return {};
  return { $or: [{ ownerId: actor.userId }, ...(actor.userId ? [{ reviewerIds: actor.userId }] : [])] };
}
