import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  requireSignedInUser: vi.fn(),
  isAuthResponse: vi.fn(),
  readPropertyScanSession: vi.fn(),
  appendPropertyScanAssets: vi.fn(),
  upload: vi.fn(),
  remove: vi.fn(),
  from: vi.fn(),
}));

vi.mock('@/lib/core/routeAuth', () => ({
  requireSignedInUser: mocks.requireSignedInUser,
  isAuthResponse: mocks.isAuthResponse,
}));
vi.mock('@/lib/scans/propertyScanStore', () => ({
  readPropertyScanSession: mocks.readPropertyScanSession,
  appendPropertyScanAssets: mocks.appendPropertyScanAssets,
}));
vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: { storage: { from: mocks.from } },
}));

import { POST } from '@/app/api/property-scans/[scanId]/assets/route';
import { propertyScanAssetLimits } from '@/lib/scans/propertyScanContract';

const session = { scanId: 'scan-1', revision: 1, ownerId: 'owner-1' };

function requestWithFiles(files: File[], expectedRevision = 1) {
  const formData = new FormData();
  formData.set('expectedRevision', String(expectedRevision));
  files.forEach((file) => formData.append('files', file));
  return { formData: async () => formData } as unknown as NextRequest;
}

function file(name: string, type: string, contents = 'capture') {
  const raw = contents === 'capture' && type === 'image/jpeg' ? new Uint8Array([0xff, 0xd8, 0xff, 0xd9]) : new TextEncoder().encode(contents);
  const capture = new File([raw], name, { type });
  Object.defineProperty(capture, 'arrayBuffer', { value: async () => raw.buffer });
  return capture;
}

describe('property scan upload route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('NEXT_PUBLIC_MOCK_MODE', 'true');
    mocks.isAuthResponse.mockImplementation((value) => value instanceof Response);
    mocks.requireSignedInUser.mockResolvedValue({ allowed: true, user: { id: 'owner-1' } });
    mocks.readPropertyScanSession.mockResolvedValue(session);
    mocks.appendPropertyScanAssets.mockResolvedValue({ ...session, revision: 2, status: 'in_review', assets: [] });
    mocks.upload.mockResolvedValue({ error: null });
    mocks.remove.mockResolvedValue({ error: null });
    mocks.from.mockReturnValue({ upload: mocks.upload, remove: mocks.remove });
  });

  it('requires the current session revision before uploading', async () => {
    const response = await POST(
      requestWithFiles([file('living-room.jpg', 'image/jpeg')], 0),
      { params: Promise.resolve({ scanId: 'scan-1' }) },
    );

    expect(response.status).toBe(400);
    expect(mocks.upload).not.toHaveBeenCalled();
    expect(mocks.appendPropertyScanAssets).not.toHaveBeenCalled();
  });

  it('rejects empty and unsupported files before storage', async () => {
    const empty = file('empty.jpg', 'image/jpeg', '');
    const emptyResponse = await POST(requestWithFiles([empty]), { params: Promise.resolve({ scanId: 'scan-1' }) });
    expect(emptyResponse.status).toBe(400);

    const unsupportedResponse = await POST(requestWithFiles([file('capture.gif', 'image/gif')]), { params: Promise.resolve({ scanId: 'scan-1' }) });
    expect(unsupportedResponse.status).toBe(400);
    expect(mocks.upload).not.toHaveBeenCalled();
  });

  it('rejects a spoofed MIME label before storage', async () => {
    const response = await POST(requestWithFiles([file('fake.jpg', 'image/jpeg', 'not an image')]), { params: Promise.resolve({ scanId: 'scan-1' }) });

    expect(response.status).toBe(400);
    expect(mocks.upload).not.toHaveBeenCalled();
    expect(mocks.appendPropertyScanAssets).not.toHaveBeenCalled();
  });

  it('prevalidates the full batch before creating any storage object', async () => {
    const response = await POST(requestWithFiles([
      file('valid.jpg', 'image/jpeg'),
      file('spoofed.jpg', 'image/jpeg', 'not an image'),
    ]), { params: Promise.resolve({ scanId: 'scan-1' }) });

    expect(response.status).toBe(400);
    expect(mocks.upload).not.toHaveBeenCalled();
    expect(mocks.remove).not.toHaveBeenCalled();
  });

  it('cleans up paths created by a partial storage failure', async () => {
    mocks.upload.mockResolvedValueOnce({ error: null }).mockResolvedValueOnce({ error: { message: 'storage unavailable' } });

    const response = await POST(requestWithFiles([
      file('first.jpg', 'image/jpeg'),
      file('second.jpg', 'image/jpeg'),
    ]), { params: Promise.resolve({ scanId: 'scan-1' }) });

    expect(response.status).toBe(502);
    expect(mocks.remove).toHaveBeenCalledWith([expect.stringMatching(/^owner-1\/scan-1\/[^/]+-first\.jpg$/), expect.stringMatching(/^owner-1\/scan-1\/[^/]+-second\.jpg$/)]);
    expect(mocks.appendPropertyScanAssets).not.toHaveBeenCalled();
  });

  it('cleans up uploaded paths when the manifest revision loses a race', async () => {
    mocks.appendPropertyScanAssets.mockResolvedValue(null);

    const response = await POST(requestWithFiles([file('capture.jpg', 'image/jpeg')]), { params: Promise.resolve({ scanId: 'scan-1' }) });

    expect(response.status).toBe(409);
    expect(mocks.remove).toHaveBeenCalledWith([expect.stringMatching(/^owner-1\/scan-1\/[^/]+-capture\.jpg$/)]);
  });

  it('rejects files over the configured per-file limit before storage', async () => {
    const oversized = file('large.mp4', 'video/mp4');
    Object.defineProperty(oversized, 'size', { value: propertyScanAssetLimits.maxBytesPerFile + 1 });

    const response = await POST(requestWithFiles([oversized]), { params: Promise.resolve({ scanId: 'scan-1' }) });

    expect(response.status).toBe(400);
    expect(mocks.upload).not.toHaveBeenCalled();
  });

  it('stores an owner-scoped safe path and fences the manifest append', async () => {
    const response = await POST(requestWithFiles([file('living room/../capture.jpg', 'image/jpeg')]), { params: Promise.resolve({ scanId: 'scan-1' }) });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mocks.from).toHaveBeenCalledWith('property-scans');
    expect(mocks.upload).toHaveBeenCalledWith(expect.stringMatching(/^owner-1\/scan-1\/[^/]+-capture\.jpg$/), expect.any(Buffer), expect.objectContaining({ contentType: 'image/jpeg', upsert: false }));
    expect(mocks.appendPropertyScanAssets).toHaveBeenCalledWith('scan-1', 'owner-1', [expect.objectContaining({ fileName: 'living room/../capture.jpg', mimeType: 'image/jpeg', size: expect.any(Number) })], 1);
    expect(body.data.uploaded).toBe(1);
  });
});
