import { beforeAll, afterAll, describe, expect, it, vi } from 'vitest';
import { randomUUID, createHash } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import mongoose from 'mongoose';

vi.mock('server-only', () => ({}));
// This suite is opt-in; the Mongo-only runner must not contact Storage/Auth.
const origin = process.env.PULSE_SCAN_ACCEPTANCE_ORIGIN;
describe.skipIf(!origin)('disposable Auth + Storage + Mongo scan acceptance', () => {
  let admin: ReturnType<typeof createClient>;
  let cookie: string;
  let owner: string;
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64');
  const api = async (path: string, body?: unknown, auth = cookie) => {
    const response = await fetch(`${origin}/api/property-scans${path}`, {
      method: body ? 'POST' : 'GET', headers: { Cookie: auth, 'Content-Type': 'application/json' },
      ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(60000),
    });
    return { status: response.status, body: await response.json() };
  };
  beforeAll(async () => {
    expect(process.env.SUPABASE_URL).toMatch(/^http:\/\/127\.0\.0\.1:\d+$/);
    expect(process.env.MONGODB_URI).toMatch(/^mongodb:\/\/127\.0\.0\.1:\d+\/pulse_scan_acceptance$/);
    admin = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });
    const email = `scan-${randomUUID()}@example.test`, password = `Test-${randomUUID()}!`;
    const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
    expect(created.error).toBeNull(); owner = created.data.user!.id;
    const cookies = new Map<string, string>();
    const client = createServerClient(process.env.SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      cookies: { getAll: () => [...cookies].map(([name, value]) => ({ name, value })), setAll: (values) => { for (const entry of values) cookies.set(entry.name, entry.value); } },
    });
    expect((await client.auth.signInWithPassword({ email, password })).error).toBeNull();
    cookie = [...cookies].map(([name, value]) => `${name}=${value}`).join('; ');
    await mongoose.connect(process.env.MONGODB_URI!);
  }, 60000);
  afterAll(async () => { if (owner) await admin.auth.admin.deleteUser(owner); await mongoose.disconnect(); });
  async function reserve() {
    const created = await api('', { propertyAddress: 'Synthetic local scan fixture', captureMode: 'photo_walkthrough', consent: { ownerAuthorized: true, interiorCaptureAcknowledged: true, publicListingApproval: false } });
    expect(created.status).toBe(201);
    const session = created.body.data.session;
    const reserved = await api(`/${session.scanId}/uploads`, { idempotencyKey: randomUUID(), fileName: 'pixel.png', mimeType: 'image/png', declaredBytes: png.length, expectedRevision: session.revision });
    expect(reserved.status).toBe(200);
    return { session, ...reserved.body.data };
  }
  async function upload(fixture: any) {
    const client = createClient(process.env.SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } });
    const result = await client.storage.from('property-scans').uploadToSignedUrl(fixture.upload.path, fixture.upload.token, png, { contentType: 'image/png' });
    expect(result.error).toBeNull();
  }
  it('authenticates real cookies, finalizes actual bytes, and replays completion once', async () => {
    expect((await api('', undefined, '')).status).toBe(401);
    const fixture = await reserve(); await upload(fixture);
    const path = `/${fixture.session.scanId}/uploads/${fixture.reservation.uploadId}/complete`;
    const result = await api(path, { expectedRevision: fixture.session.revision });
    expect(result.status).toBe(200);
    expect(result.body.data.session.assets).toHaveLength(1);
    expect(JSON.stringify(result.body)).toContain(createHash('sha256').update(png).digest('hex'));
    expect((await api(path, { expectedRevision: fixture.session.revision })).body.data.session.assets).toHaveLength(1);
  }, 120000);
  it('rejects a changed object and removes its real Storage bytes', async () => {
    const fixture = await reserve(); await upload(fixture);
    expect((await admin.storage.from('property-scans').update(fixture.upload.path, Buffer.concat([png, Buffer.from('changed')]), { contentType: 'image/png' })).error).toBeNull();
    const result = await api(`/${fixture.session.scanId}/uploads/${fixture.reservation.uploadId}/complete`, { expectedRevision: fixture.session.revision });
    expect([409, 422]).toContain(result.status);
    expect((await admin.storage.from('property-scans').info(fixture.upload.path)).error).not.toBeNull();
    const { readPropertyScanSession } = await import('@/lib/scans/propertyScanStore');
    expect((await readPropertyScanSession(fixture.session.scanId, owner))!.assets).toHaveLength(0);
  }, 120000);
  it('retains cleanup intent on injected delete failure, then deletes actual bytes on retry', async () => {
    const fixture = await reserve(); await upload(fixture);
    const { supabaseAdmin } = await import('@/lib/supabase');
    const { abortScanUpload, reconcileScanUploadReservations } = await import('@/lib/scans/scanUpload.server');
    const original = supabaseAdmin.storage.from.bind(supabaseAdmin.storage);
    const failure = vi.spyOn(supabaseAdmin.storage, 'from').mockImplementation((bucket: string) => {
      const storage = original(bucket); storage.remove = async () => ({ data: null, error: new Error('Injected local transport failure') } as any); return storage;
    });
    try { expect((await abortScanUpload(fixture.session.scanId, owner, fixture.reservation.uploadId))!.uploadReservations[0].cleanupPending).toBe(true); }
    finally { failure.mockRestore(); }
    expect((await admin.storage.from('property-scans').info(fixture.upload.path)).error).toBeNull();
    const { PropertyScanSession } = await import('@/models/PropertyScanSession');
    // Advance only the disposable fixture's cleanup eligibility, not Auth time.
    await PropertyScanSession.updateOne({ scanId: fixture.session.scanId }, { $set: { 'uploadReservations.0.capabilityExpiresAt': new Date(0) } });
    const result = await reconcileScanUploadReservations();
    expect(result.failed).toBe(0);
    expect((await admin.storage.from('property-scans').info(fixture.upload.path)).error).not.toBeNull();
  }, 120000);
  it('retains cancellation cleanup while a signed URL can recreate the object', async () => {
    const fixture = await reserve(); await upload(fixture);
    const { abortScanUpload, reconcileScanUploadReservations } = await import('@/lib/scans/scanUpload.server');
    const cancelled = await abortScanUpload(fixture.session.scanId, owner, fixture.reservation.uploadId);
    expect(cancelled!.uploadReservations[0].cleanupPending).toBe(true);
    await upload(fixture); // Real Storage token replay after deletion.
    await reconcileScanUploadReservations();
    expect((await admin.storage.from('property-scans').info(fixture.upload.path)).error).toBeNull();
    const { PropertyScanSession } = await import('@/models/PropertyScanSession');
    await PropertyScanSession.updateOne({ scanId: fixture.session.scanId }, { $set: { 'uploadReservations.0.capabilityExpiresAt': new Date(0) } });
    await reconcileScanUploadReservations();
    expect((await admin.storage.from('property-scans').info(fixture.upload.path)).error).not.toBeNull();
  }, 120000);
});
