import { beforeAll, afterAll, describe, it, expect, vi } from 'vitest';
import mongoose from 'mongoose';
import { randomUUID } from 'node:crypto';

vi.mock('server-only', () => ({}));
// No shortlist/MLS fixture is required for these unlinked captures; fail closed
// if the store accidentally starts using an external Supabase dependency.
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: () => { throw new Error('Unexpected external database access'); } } }));
import { PropertyScanSession } from '@/models/PropertyScanSession';
import { abortPropertyScanUpload, createPropertyScanSession, appendPropertyScanAssets, expirePropertyScanUploadReservations, finalizePropertyScanUpload, reservePropertyScanUpload, updatePropertyScanReview, updatePropertyScanReviewers, readPropertyScanSession, readPropertyScanSessionForActor } from '@/lib/scans/propertyScanStore';

const owner = randomUUID();
const asset = () => ({ assetId: randomUUID(), path: `${owner}/fixture/${randomUUID()}.jpg`, fileName: 'room.jpg', mimeType: 'image/jpeg', size: 10, capturedAt: null, uploadedAt: new Date().toISOString() });
const create = () => createPropertyScanSession({ propertyAddress: 'Local acceptance fixture', listingId: null, captureMode: 'photo_walkthrough', consent: { ownerAuthorized: true, interiorCaptureAcknowledged: true, publicListingApproval: false } }, owner);
const reservation = (overrides: Partial<{ idempotencyKey: string; fileName: string; mimeType: string; declaredBytes: number; expectedRevision: number }> = {}) => ({ idempotencyKey: randomUUID(), fileName: 'room.jpg', mimeType: 'image/jpeg', declaredBytes: 10, expectedRevision: 1, ...overrides });

beforeAll(async () => {
  const uri = process.env.PULSE_TEST_MONGO_URI || '';
  if (!/^mongodb:\/\/127\.0\.0\.1:\d+\/pulse_scan_acceptance$/.test(uri)) throw new Error('Run npm run test:db:mongo for an isolated database');
  vi.stubEnv('NEXT_PUBLIC_MOCK_MODE', 'false');
  vi.stubEnv('MONGODB_URI', uri);
  vi.stubEnv('PROPERTY_SCAN_REVIEWER_IDS', '');
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
  await PropertyScanSession.init();
});

afterAll(async () => { await mongoose.disconnect(); vi.unstubAllEnvs(); });

describe('real Mongo conditional scan mutations', () => {
  it('persists exactly one of two appends using the same revision', async () => {
    const session = await create();
    const results = await Promise.all([
      appendPropertyScanAssets(session.scanId, owner, [asset()], 1),
      appendPropertyScanAssets(session.scanId, owner, [asset()], 1),
    ]);
    expect(results.filter(Boolean)).toHaveLength(1);
    expect(await readPropertyScanSession(session.scanId, owner)).toMatchObject({ revision: 2, assets: [expect.any(Object)] });
  });

  it('serializes approval against upload without accepting both revisions', async () => {
    const session = await create();
    const captured = (await appendPropertyScanAssets(session.scanId, owner, [asset()], 1))!;
    const results = await Promise.all([
      updatePropertyScanReview(session.scanId, 'approved', 'reviewer', 'Inspected', captured.revision, captured.manifestHash),
      appendPropertyScanAssets(session.scanId, owner, [asset()], captured.revision),
    ]);
    expect(results.filter(Boolean)).toHaveLength(1);
    const saved = (await readPropertyScanSession(session.scanId, owner))!;
    expect(saved.revision).toBe(3);
    if (saved.status === 'approved') expect(saved.approvedManifestHash).toBe(saved.manifestHash);
    else expect(saved.approvedManifestHash).toBeNull();
  });

  it('accepts one competing review and records one audit event', async () => {
    const session = await create();
    const captured = (await appendPropertyScanAssets(session.scanId, owner, [asset()], 1))!;
    const reviews = await Promise.all([
      updatePropertyScanReview(session.scanId, 'approved', 'a', null, 2, captured.manifestHash),
      updatePropertyScanReview(session.scanId, 'rejected', 'b', null, 2, captured.manifestHash),
    ]);
    expect(reviews.filter(Boolean)).toHaveLength(1);
    expect((await readPropertyScanSession(session.scanId, owner))!.reviewEvents).toHaveLength(1);
  });

  it('revokes reviewer access and rejects stale or foreign assignment edits', async () => {
    const session = await create();
    const reviewer = { userId: 'assigned-reviewer', mode: 'authenticated' as const, role: 'operator' };
    await updatePropertyScanReviewers(session.scanId, owner, [reviewer.userId], 1);
    expect(await readPropertyScanSessionForActor(session.scanId, reviewer)).not.toBeNull();
    expect(await updatePropertyScanReviewers(session.scanId, 'foreign-owner', [], 2)).toBeNull();
    await updatePropertyScanReviewers(session.scanId, owner, [], 2);
    expect(await updatePropertyScanReviewers(session.scanId, owner, [reviewer.userId], 2)).toBeNull();
    expect(await readPropertyScanSessionForActor(session.scanId, reviewer)).toBeNull();
  });

  for (const mutation of ['upload', 'reject'] as const) {
    it(`invalidates current artifacts on ${mutation} without reviving revoked ones`, async () => {
      const session = await create();
      const captured = (await appendPropertyScanAssets(session.scanId, owner, [asset()], 1))!;
      const approved = (await updatePropertyScanReview(session.scanId, 'approved', 'reviewer', null, 2, captured.manifestHash))!;
      await PropertyScanSession.updateOne({ scanId: session.scanId }, { $set: { artifactRefs: ['current', 'revoked'].map((status) => ({ artifactId: randomUUID(), status, inputRevision: 2, inputManifestHash: captured.manifestHash, createdAt: new Date() })) } });
      if (mutation === 'upload') await appendPropertyScanAssets(session.scanId, owner, [asset()], approved.revision);
      else await updatePropertyScanReview(session.scanId, 'rejected', 'reviewer', null, approved.revision, approved.manifestHash);
      const raw = await PropertyScanSession.findOne({ scanId: session.scanId }).lean<{ artifactRefs: Array<{ status: string }> }>();
      expect(raw!.artifactRefs.map((ref: { status: string }) => ref.status)).toEqual(['stale', 'revoked']);
      expect((await readPropertyScanSession(session.scanId, owner))!.approvedManifestHash).toBeNull();
    });
  }

  it('does not serialize a mismatched artifact as current', async () => {
    const session = await create();
    await PropertyScanSession.updateOne({ scanId: session.scanId }, { $set: { artifactRefs: [{ artifactId: randomUUID(), status: 'current', inputRevision: 99, inputManifestHash: 'stale-hash', createdAt: new Date() }] } });
    expect((await readPropertyScanSession(session.scanId, owner))!.artifactRefs[0].status).toBe('stale');
  });

  it('limits concurrent reservations and replays the same idempotency key', async () => {
    const session = await create();
    const first = reservation({ idempotencyKey: 'reservation-replay-1' });
    const results = await Promise.all([
      reservePropertyScanUpload(session.scanId, owner, first),
      reservePropertyScanUpload(session.scanId, owner, reservation({ idempotencyKey: 'reservation-2' })),
      reservePropertyScanUpload(session.scanId, owner, reservation({ idempotencyKey: 'reservation-3' })),
    ]);
    expect(results.filter(Boolean)).toHaveLength(2);
    const replay = await reservePropertyScanUpload(session.scanId, owner, first);
    expect(replay?.uploadReservations.find((item) => item.idempotencyKey === first.idempotencyKey)).toMatchObject({ state: 'pending' });
    expect(replay?.uploadReservations.filter((item) => item.state === 'pending')).toHaveLength(2);
  });

  it('finalizes a reservation once, supports abort, and expires abandoned uploads', async () => {
    const session = await create();
    const pending = reservation({ idempotencyKey: 'reservation-finalize-1' });
    const reserved = (await reservePropertyScanUpload(session.scanId, owner, pending))!;
    const uploadReservation = reserved.uploadReservations.find((item) => item.idempotencyKey === pending.idempotencyKey)!;
    const uploadId = uploadReservation.uploadId;
    const assetRecord = await finalizePropertyScanUpload(session.scanId, owner, uploadId, { assetId: uploadReservation.assetId!, path: `${owner}/fixture/final.jpg`, fileName: pending.fileName, mimeType: pending.mimeType, size: pending.declaredBytes, capturedAt: null, uploadedAt: new Date().toISOString() }, 1);
    expect(assetRecord).toMatchObject({ revision: 2, assets: [expect.any(Object)] });
    expect((await finalizePropertyScanUpload(session.scanId, owner, uploadId, { assetId: randomUUID(), path: `${owner}/fixture/ignored.jpg`, fileName: pending.fileName, mimeType: pending.mimeType, size: pending.declaredBytes, capturedAt: null, uploadedAt: new Date().toISOString() }, 1))?.assets).toHaveLength(1);

    const abortedInput = reservation({ idempotencyKey: 'reservation-abort-1', expectedRevision: 2 });
    const aborted = (await reservePropertyScanUpload(session.scanId, owner, abortedInput))!;
    const abortedId = aborted.uploadReservations.find((item) => item.idempotencyKey === abortedInput.idempotencyKey)!.uploadId;
    await abortPropertyScanUpload(session.scanId, owner, abortedId);
    expect((await readPropertyScanSession(session.scanId, owner))!.uploadReservations.find((item) => item.uploadId === abortedId)?.state).toBe('aborted');

    const expiredInput = reservation({ idempotencyKey: 'reservation-expired-1', expectedRevision: 2 });
    const expired = (await reservePropertyScanUpload(session.scanId, owner, expiredInput))!;
    const expiredId = expired.uploadReservations.find((item) => item.idempotencyKey === expiredInput.idempotencyKey)!.uploadId;
    await PropertyScanSession.updateOne({ scanId: session.scanId, 'uploadReservations.uploadId': expiredId }, { $set: { 'uploadReservations.$.expiresAt': new Date(Date.now() - 1000) } });
    expect(await expirePropertyScanUploadReservations()).toBeGreaterThanOrEqual(1);
    expect((await readPropertyScanSession(session.scanId, owner))!.uploadReservations.find((item) => item.uploadId === expiredId)?.state).toBe('expired');
  });
});
