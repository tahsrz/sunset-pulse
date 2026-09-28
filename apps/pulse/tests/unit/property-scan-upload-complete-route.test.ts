import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  requireSignedInUser: vi.fn(),
  isAuthResponse: vi.fn(),
  readPropertyScanSession: vi.fn(),
  abortScanUpload: vi.fn(),
  finalizeScanUpload: vi.fn(),
  storageFrom: vi.fn(),
  info: vi.fn(),
  download: vi.fn(),
}));

vi.mock('@/lib/core/routeAuth', () => ({
  requireSignedInUser: mocks.requireSignedInUser,
  isAuthResponse: mocks.isAuthResponse,
}));
vi.mock('@/lib/scans/propertyScanStore', () => ({ readPropertyScanSession: mocks.readPropertyScanSession }));
vi.mock('@/lib/scans/scanUpload.server', () => ({
  abortScanUpload: mocks.abortScanUpload,
  finalizeScanUpload: mocks.finalizeScanUpload,
  propertyScanUploadPath: () => 'owner-1/scan-1/upload-1-room.jpg',
}));
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { storage: { from: mocks.storageFrom } } }));

import { POST } from '@/app/api/property-scans/[scanId]/uploads/[uploadId]/complete/route';

const reservation = {
  uploadId: 'upload-1',
  assetId: 'asset-1',
  fileName: 'room.jpg',
  mimeType: 'image/jpeg',
  declaredBytes: 4,
  expectedRevision: 1,
  state: 'pending',
  cleanupPending: false,
};
const session = { scanId: 'scan-1', ownerId: 'owner-1', revision: 1, uploadReservations: [reservation] };

function request() {
  return new NextRequest('http://localhost/api/property-scans/scan-1/uploads/upload-1/complete', { method: 'POST' });
}

describe('property scan upload completion route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('NEXT_PUBLIC_MOCK_MODE', 'false');
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key');
    mocks.requireSignedInUser.mockResolvedValue({ allowed: true, user: { id: 'owner-1' } });
    mocks.isAuthResponse.mockImplementation((value) => value instanceof Response);
    mocks.readPropertyScanSession.mockResolvedValue(session);
    mocks.abortScanUpload.mockResolvedValue({
      ...session,
      uploadReservations: [{ ...reservation, state: 'aborted', cleanupPending: true }],
    });
    mocks.finalizeScanUpload.mockResolvedValue({ ...session, revision: 2 });
    mocks.info.mockResolvedValue({ data: { size: 4, contentType: 'image/jpeg' }, error: null });
    mocks.download.mockResolvedValue({ data: { arrayBuffer: async () => new Uint8Array([0, 1, 2, 3]).buffer }, error: null });
    mocks.storageFrom.mockReturnValue({ info: mocks.info, download: mocks.download });
  });

  it('rejects changed bytes and retains cleanup-pending evidence for retry', async () => {
    const response = await POST(request(), { params: Promise.resolve({ scanId: 'scan-1', uploadId: 'upload-1' }) });
    const body = await response.json();

    expect(response.status).toBe(422);
    expect(body.code).toBe('SCAN_UPLOAD_REJECTED_CLEANUP_PENDING');
    expect(mocks.abortScanUpload).toHaveBeenCalledWith('scan-1', 'owner-1', 'upload-1');
    expect(mocks.finalizeScanUpload).not.toHaveBeenCalled();
  });

  it('rejects changed object metadata before download or manifest finalization', async () => {
    mocks.info.mockResolvedValue({ data: { size: 5, contentType: 'image/jpeg' }, error: null });

    const response = await POST(request(), { params: Promise.resolve({ scanId: 'scan-1', uploadId: 'upload-1' }) });
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.code).toBe('SCAN_UPLOAD_REJECTED_CLEANUP_PENDING');
    expect(mocks.download).not.toHaveBeenCalled();
    expect(mocks.finalizeScanUpload).not.toHaveBeenCalled();
  });
});
