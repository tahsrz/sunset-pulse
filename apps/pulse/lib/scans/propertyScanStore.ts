import 'server-only';

import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import connectDB from '@/lib/core/database';
import { PropertyScanSession } from '@/models/PropertyScanSession';
import type { PropertyScanAsset, PropertyScanRequest } from '@/lib/scans/propertyScanContract';

export type PropertyScanSessionRecord = PropertyScanRequest & {
  scanId: string;
  ownerId: string;
  status: 'capture_ready' | 'in_review' | 'approved' | 'rejected';
  reviewNote: string | null;
  reviewedAt: string | null;
  reviewedBy: string | null;
  assets: PropertyScanAsset[];
  createdAt: string;
  updatedAt: string;
};

export async function createPropertyScanSession(input: PropertyScanRequest, ownerId: string) {
  if (isMockMode()) return createMockSession(input, ownerId);

  await connectDB();
  const record = await PropertyScanSession.create({
    scanId: `scan_${randomUUID()}`,
    ownerId,
    ...input,
    status: 'capture_ready',
    assets: [],
  });
  return serialize(record);
}

export async function listPropertyScanSessions(ownerId: string) {
  if (isMockMode()) return [...getMockSessions().values()]
    .filter((session) => session.ownerId === ownerId)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  await connectDB();
  const records = await PropertyScanSession.find({ ownerId }).sort({ updatedAt: -1 }).limit(50).lean();
  return records.map(serialize);
}

export async function listAllPropertyScanSessions() {
  if (isMockMode()) return [...getMockSessions().values()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  await connectDB();
  const records = await PropertyScanSession.find({}).sort({ updatedAt: -1 }).limit(100).lean();
  return records.map(serialize);
}

export async function readPropertyScanSession(scanId: string, ownerId: string) {
  if (isMockMode()) return getMockSessions().get(scanId)?.ownerId === ownerId ? getMockSessions().get(scanId) || null : null;

  await connectDB();
  const record = await PropertyScanSession.findOne({ scanId, ownerId }).lean();
  return record ? serialize(record) : null;
}

export async function appendPropertyScanAssets(scanId: string, ownerId: string, assets: PropertyScanAsset[]) {
  if (isMockMode()) {
    const record = getMockSessions().get(scanId);
    if (!record || record.ownerId !== ownerId) return null;
    record.assets = [...record.assets, ...assets];
    record.status = 'in_review';
    record.updatedAt = new Date().toISOString();
    persistMockSessions();
    return record;
  }

  await connectDB();
  const record = await PropertyScanSession.findOneAndUpdate(
    { scanId, ownerId },
    { $push: { assets: { $each: assets } }, $set: { status: 'in_review' } },
    { new: true },
  ).lean();
  return record ? serialize(record) : null;
}

export async function updatePropertyScanReview(
  scanId: string,
  status: 'in_review' | 'approved' | 'rejected',
  reviewer: string,
  reviewNote: string | null,
) {
  if (isMockMode()) {
    const record = getMockSessions().get(scanId);
    if (!record) return null;
    record.status = status;
    record.reviewNote = reviewNote;
    record.reviewedBy = reviewer;
    record.reviewedAt = new Date().toISOString();
    record.updatedAt = record.reviewedAt;
    persistMockSessions();
    return record;
  }

  await connectDB();
  const record = await PropertyScanSession.findOneAndUpdate(
    { scanId },
    { $set: { status, reviewNote, reviewedBy: reviewer, reviewedAt: new Date() } },
    { new: true },
  ).lean();
  return record ? serialize(record) : null;
}

function serialize(record: any): PropertyScanSessionRecord {
  return {
    scanId: record.scanId,
    ownerId: record.ownerId,
    propertyAddress: record.propertyAddress,
    listingId: record.listingId || null,
    captureMode: record.captureMode,
    status: record.status,
    reviewNote: record.reviewNote || null,
    reviewedAt: record.reviewedAt ? new Date(record.reviewedAt).toISOString() : null,
    reviewedBy: record.reviewedBy || null,
    consent: record.consent,
    assets: (record.assets || []).map((asset: any) => ({
      path: asset.path,
      fileName: asset.fileName,
      mimeType: asset.mimeType,
      size: asset.size,
      capturedAt: new Date(asset.capturedAt).toISOString(),
    })),
    createdAt: new Date(record.createdAt).toISOString(),
    updatedAt: new Date(record.updatedAt).toISOString(),
  };
}

type MockSessionMap = Map<string, PropertyScanSessionRecord>;
type MockGlobal = typeof globalThis & { __sunsetPulseMockPropertyScans?: MockSessionMap };

function getMockSessions(): MockSessionMap {
  const globalStore = globalThis as MockGlobal;
  if (!globalStore.__sunsetPulseMockPropertyScans) globalStore.__sunsetPulseMockPropertyScans = readMockSessions();
  return globalStore.__sunsetPulseMockPropertyScans;
}

function createMockSession(input: PropertyScanRequest, ownerId: string) {
  const now = new Date().toISOString();
  const record: PropertyScanSessionRecord = {
    scanId: `scan_${randomUUID()}`,
    ownerId,
    ...input,
    status: 'capture_ready',
    reviewNote: null,
    reviewedAt: null,
    reviewedBy: null,
    assets: [],
    createdAt: now,
    updatedAt: now,
  };
  getMockSessions().set(record.scanId, record);
  persistMockSessions();
  return record;
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
