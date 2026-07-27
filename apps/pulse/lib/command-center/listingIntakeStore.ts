import 'server-only';

import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import connectDB from '@/lib/core/database';
import { ListingIntake } from '@/models/ListingIntake';

export type ListingIntakeSnapshot = {
  sourceCommand: string;
  approvedFacts: Record<string, unknown>;
  drafts: { mls: string; social: string; buyer: string };
  publishStatus: 'review' | 'ready';
  warnings: string[];
  missingFields: string[];
};

export class ListingIntakeConflictError extends Error {}
export class ListingIntakeAccessError extends Error {}
export class ListingIntakePublishGateError extends Error {
  constructor(readonly blockers: string[]) {
    super('Listing intake has unresolved validation items.');
  }
}

export type ListingIntakePropertyApplicationInput = {
  intakeId: string;
  ownerId: string;
  actor: string;
  expectedVersion: number;
  applicationId: string;
  propertyId: string;
  mlsId: string | null;
  fields: string[];
  expectedPropertyLastUpdated: string | null;
};

export async function createListingIntake(snapshot: ListingIntakeSnapshot, ownerId: string, actor: string) {
  assertPublishGate(snapshot);
  if (isMockMode()) return createMockListingIntake(snapshot, ownerId, actor);

  await connectDB();
  const now = new Date();
  const intakeId = `li_${randomUUID()}`;
  const record = await ListingIntake.create({
    intakeId,
    ownerId,
    ...snapshot,
    version: 1,
    history: [buildHistoryEntry(snapshot, 1, 'created', actor, now)],
  });
  return serializeListingIntake(record);
}

export async function readListingIntake(intakeId: string, ownerId: string) {
  if (isMockMode()) return readMockListingIntake(intakeId, ownerId);

  await connectDB();
  const record = await ListingIntake.findOne({ intakeId }).lean() as any;
  if (!record) return null;
  assertOwnership(record, ownerId);
  return serializeListingIntake(record);
}

export async function updateListingIntake(
  intakeId: string,
  snapshot: ListingIntakeSnapshot,
  ownerId: string,
  actor: string,
  expectedVersion: number,
) {
  assertPublishGate(snapshot);
  if (isMockMode()) return updateMockListingIntake(intakeId, snapshot, ownerId, actor, expectedVersion);

  await connectDB();
  const record = await ListingIntake.findOne({ intakeId });
  if (!record) return null;
  assertOwnership(record, ownerId);
  if (record.version !== expectedVersion) {
    throw new ListingIntakeConflictError('This intake changed elsewhere. Reload it before saving again.');
  }

  const nextVersion = record.version + 1;
  const action = snapshot.publishStatus === 'ready' ? 'marked_ready' : 'updated';
  record.sourceCommand = snapshot.sourceCommand;
  record.approvedFacts = snapshot.approvedFacts;
  record.drafts = snapshot.drafts;
  record.publishStatus = snapshot.publishStatus;
  record.warnings = snapshot.warnings;
  record.missingFields = snapshot.missingFields;
  record.version = nextVersion;
  record.history = [...record.history.slice(-24), buildHistoryEntry(snapshot, nextVersion, action, actor, new Date())];
  await record.save();
  return serializeListingIntake(record);
}

export function getListingIntakePublishBlockers(snapshot: ListingIntakeSnapshot) {
  return [
    ...snapshot.missingFields.map((field) => `Missing required field: ${field}.`),
    ...snapshot.warnings,
  ];
}

export async function beginListingIntakePropertyApplication(input: ListingIntakePropertyApplicationInput) {
  if (isMockMode()) return beginMockListingIntakePropertyApplication(input);

  await connectDB();
  const now = new Date();
  const application = {
    applicationId: input.applicationId,
    propertyId: input.propertyId,
    mlsId: input.mlsId,
    fields: input.fields,
    expectedPropertyLastUpdated: input.expectedPropertyLastUpdated,
    status: 'pending',
    actor: input.actor,
    createdAt: now,
  };
  const record = await ListingIntake.findOneAndUpdate(
    {
      intakeId: input.intakeId,
      ownerId: input.ownerId,
      publishStatus: 'ready',
      version: input.expectedVersion,
    },
    {
      $push: { propertyApplications: { $each: [application], $slice: -25 } },
      $inc: { version: 1 },
    },
    { new: true },
  );
  if (!record) {
    const existing = await ListingIntake.findOne({ intakeId: input.intakeId }).lean() as any;
    if (!existing) return null;
    assertOwnership(existing, input.ownerId);
    if (existing.publishStatus !== 'ready') {
      throw new ListingIntakePublishGateError(['Mark the intake ready before applying it to a canonical listing.']);
    }
    throw new ListingIntakeConflictError('This intake changed elsewhere. Reload it before applying fields.');
  }
  return serializeListingIntake(record);
}

export async function completeListingIntakePropertyApplication(input: {
  intakeId: string;
  ownerId: string;
  applicationId: string;
  status: 'applied' | 'failed';
  appliedPropertyLastUpdated?: string | null;
  failureReason?: string;
}) {
  if (isMockMode()) return completeMockListingIntakePropertyApplication(input);

  await connectDB();
  const record = await ListingIntake.findOneAndUpdate(
    {
      intakeId: input.intakeId,
      ownerId: input.ownerId,
      'propertyApplications.applicationId': input.applicationId,
    },
    {
      $set: {
        'propertyApplications.$.status': input.status,
        'propertyApplications.$.appliedPropertyLastUpdated': input.appliedPropertyLastUpdated || null,
        'propertyApplications.$.failureReason': input.failureReason || null,
        'propertyApplications.$.completedAt': new Date(),
      },
    },
    { new: true },
  );
  if (!record) return null;
  return serializeListingIntake(record);
}

function assertPublishGate(snapshot: ListingIntakeSnapshot) {
  const blockers = getListingIntakePublishBlockers(snapshot);
  if (snapshot.publishStatus === 'ready' && blockers.length) {
    throw new ListingIntakePublishGateError(blockers);
  }
}

function assertOwnership(record: { ownerId?: string }, ownerId: string) {
  if (record.ownerId !== ownerId) throw new ListingIntakeAccessError('This intake belongs to another operator.');
}

function buildHistoryEntry(
  snapshot: ListingIntakeSnapshot,
  version: number,
  action: 'created' | 'updated' | 'marked_ready',
  actor: string,
  changedAt: Date,
) {
  return {
    version,
    action,
    publishStatus: snapshot.publishStatus,
    actor,
    changedAt,
    approvedFacts: snapshot.approvedFacts,
    drafts: snapshot.drafts,
  };
}

function serializeListingIntake(record: any) {
  return {
    intakeId: record.intakeId,
    sourceCommand: record.sourceCommand,
    approvedFacts: record.approvedFacts,
    drafts: record.drafts,
    publishStatus: record.publishStatus,
    warnings: record.warnings || [],
    missingFields: record.missingFields || [],
    version: record.version,
    createdAt: toIso(record.createdAt),
    updatedAt: toIso(record.updatedAt),
    history: (record.history || []).map((entry: any) => ({
      version: entry.version,
      action: entry.action,
      publishStatus: entry.publishStatus,
      actor: entry.actor,
      changedAt: toIso(entry.changedAt),
    })),
    propertyApplications: (record.propertyApplications || []).map((entry: any) => ({
      applicationId: entry.applicationId,
      propertyId: entry.propertyId,
      mlsId: entry.mlsId || null,
      fields: entry.fields || [],
      expectedPropertyLastUpdated: entry.expectedPropertyLastUpdated || null,
      appliedPropertyLastUpdated: entry.appliedPropertyLastUpdated || null,
      status: entry.status,
      failureReason: entry.failureReason || null,
      actor: entry.actor,
      createdAt: toIso(entry.createdAt),
      completedAt: toIso(entry.completedAt),
    })),
  };
}

function toIso(value: Date | string | undefined) {
  if (!value) return null;
  return new Date(value).toISOString();
}

type MockListingIntakeRecord = ListingIntakeSnapshot & {
  intakeId: string;
  ownerId: string;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  history: ReturnType<typeof buildHistoryEntry>[];
  propertyApplications: Array<Record<string, unknown>>;
};

type MockListingIntakeGlobal = typeof globalThis & {
  __sunsetPulseMockListingIntakes?: Map<string, MockListingIntakeRecord>;
};

export function resetMockListingIntakesForTests() {
  const globalStore = globalThis as MockListingIntakeGlobal;
  globalStore.__sunsetPulseMockListingIntakes = new Map();
  if (process.env.PULSE_MOCK_LISTING_INTAKE_PATH) {
    writeMockListingIntakes(globalStore.__sunsetPulseMockListingIntakes);
  }
}

export function mockListingIntakeStorePath() {
  return process.env.PULSE_MOCK_LISTING_INTAKE_PATH || path.join(process.cwd(), '.pulse-local', 'listing_intakes.json');
}

function createMockListingIntake(snapshot: ListingIntakeSnapshot, ownerId: string, actor: string) {
  const now = new Date();
  const intakeId = `li_${randomUUID()}`;
  const record: MockListingIntakeRecord = {
    intakeId,
    ownerId,
    ...cloneSnapshot(snapshot),
    version: 1,
    createdAt: now,
    updatedAt: now,
    history: [buildHistoryEntry(snapshot, 1, 'created', actor, now)],
    propertyApplications: [],
  };
  getMockListingIntakes().set(intakeId, record);
  persistMockListingIntakes();
  return serializeListingIntake(record);
}

function readMockListingIntake(intakeId: string, ownerId: string) {
  const record = getMockListingIntakes().get(intakeId);
  if (!record) return null;
  assertOwnership(record, ownerId);
  return serializeListingIntake(record);
}

function updateMockListingIntake(
  intakeId: string,
  snapshot: ListingIntakeSnapshot,
  ownerId: string,
  actor: string,
  expectedVersion: number,
) {
  const record = getMockListingIntakes().get(intakeId);
  if (!record) return null;
  assertOwnership(record, ownerId);
  if (record.version !== expectedVersion) {
    throw new ListingIntakeConflictError('This intake changed elsewhere. Reload it before saving again.');
  }

  const nextVersion = record.version + 1;
  const action = snapshot.publishStatus === 'ready' ? 'marked_ready' : 'updated';
  Object.assign(record, cloneSnapshot(snapshot), {
    version: nextVersion,
    updatedAt: new Date(),
    history: [...record.history.slice(-24), buildHistoryEntry(snapshot, nextVersion, action, actor, new Date())],
  });
  persistMockListingIntakes();
  return serializeListingIntake(record);
}

function beginMockListingIntakePropertyApplication(input: ListingIntakePropertyApplicationInput) {
  const record = getMockListingIntakes().get(input.intakeId);
  if (!record) return null;
  assertOwnership(record, input.ownerId);
  if (record.publishStatus !== 'ready') {
    throw new ListingIntakePublishGateError(['Mark the intake ready before applying it to a canonical listing.']);
  }
  if (record.version !== input.expectedVersion) {
    throw new ListingIntakeConflictError('This intake changed elsewhere. Reload it before applying fields.');
  }

  const now = new Date();
  record.propertyApplications = [...record.propertyApplications.slice(-24), {
    applicationId: input.applicationId,
    propertyId: input.propertyId,
    mlsId: input.mlsId,
    fields: input.fields,
    expectedPropertyLastUpdated: input.expectedPropertyLastUpdated,
    status: 'pending',
    actor: input.actor,
    createdAt: now,
  }];
  record.version += 1;
  record.updatedAt = now;
  persistMockListingIntakes();
  return serializeListingIntake(record);
}

function completeMockListingIntakePropertyApplication(input: {
  intakeId: string;
  ownerId: string;
  applicationId: string;
  status: 'applied' | 'failed';
  appliedPropertyLastUpdated?: string | null;
  failureReason?: string;
}) {
  const record = getMockListingIntakes().get(input.intakeId);
  if (!record) return null;
  assertOwnership(record, input.ownerId);
  const application = record.propertyApplications.find((entry) => entry.applicationId === input.applicationId);
  if (!application) return null;
  application.status = input.status;
  application.appliedPropertyLastUpdated = input.appliedPropertyLastUpdated || null;
  application.failureReason = input.failureReason || null;
  application.completedAt = new Date();
  record.updatedAt = new Date();
  persistMockListingIntakes();
  return serializeListingIntake(record);
}

function getMockListingIntakes() {
  const globalStore = globalThis as MockListingIntakeGlobal;
  if (!globalStore.__sunsetPulseMockListingIntakes) {
    globalStore.__sunsetPulseMockListingIntakes = readMockListingIntakes();
  }
  return globalStore.__sunsetPulseMockListingIntakes;
}

function persistMockListingIntakes() {
  writeMockListingIntakes(getMockListingIntakes());
}

function readMockListingIntakes() {
  const filePath = mockListingIntakeStorePath();
  if (!fs.existsSync(filePath)) return new Map<string, MockListingIntakeRecord>();

  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const records: MockListingIntakeRecord[] = Array.isArray(parsed?.intakes)
      ? parsed.intakes.filter(isMockListingIntakeRecord)
      : [];
    return new Map<string, MockListingIntakeRecord>(records.map((record) => [record.intakeId, record]));
  } catch {
    return new Map<string, MockListingIntakeRecord>();
  }
}

function writeMockListingIntakes(intakes: Map<string, MockListingIntakeRecord>) {
  const filePath = mockListingIntakeStorePath();
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify({ intakes: [...intakes.values()] }, null, 2), 'utf8');
}

function isMockListingIntakeRecord(value: unknown): value is MockListingIntakeRecord {
  const record = value as Partial<MockListingIntakeRecord>;
  return Boolean(record?.intakeId && record?.ownerId && record?.version && record?.approvedFacts && record?.drafts);
}

function cloneSnapshot(snapshot: ListingIntakeSnapshot): ListingIntakeSnapshot {
  return {
    sourceCommand: snapshot.sourceCommand,
    approvedFacts: cloneJson(snapshot.approvedFacts),
    drafts: cloneJson(snapshot.drafts),
    publishStatus: snapshot.publishStatus,
    warnings: [...snapshot.warnings],
    missingFields: [...snapshot.missingFields],
  };
}

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function isMockMode() {
  return process.env.NEXT_PUBLIC_MOCK_MODE === 'true';
}
