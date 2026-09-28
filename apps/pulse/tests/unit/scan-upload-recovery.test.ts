import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  abortPropertyScanUpload: vi.fn(),
  finalizePropertyScanUpload: vi.fn(),
  listExpiredPropertyScanUploadReservations: vi.fn(),
  completePropertyScanUploadCleanup: vi.fn(),
  reservePropertyScanUpload: vi.fn(),
  readPropertyScanSession: vi.fn(),
  remove: vi.fn(),
  storageFrom: vi.fn(),
}));

vi.mock('server-only', () => ({}));
vi.mock('@/lib/scans/propertyScanStore', () => ({
  abortPropertyScanUpload: mocks.abortPropertyScanUpload,
  finalizePropertyScanUpload: mocks.finalizePropertyScanUpload,
  listExpiredPropertyScanUploadReservations: mocks.listExpiredPropertyScanUploadReservations,
  completePropertyScanUploadCleanup: mocks.completePropertyScanUploadCleanup,
  reservePropertyScanUpload: mocks.reservePropertyScanUpload,
  readPropertyScanSession: mocks.readPropertyScanSession,
}));
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { storage: { from: mocks.storageFrom } } }));

import { abortScanUpload, reconcileScanUploadReservations } from '@/lib/scans/scanUpload.server';

const target = {
  scanId: 'scan-1',
  ownerId: 'owner-1',
  uploadId: 'upload-1',
  fileName: 'room.jpg',
  mimeType: 'image/jpeg',
  cleanupPending: true,
};
let reservationState: { state: string; cleanupPending: boolean };

describe('property scan upload cleanup retry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('NEXT_PUBLIC_MOCK_MODE', 'false');
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key');
    reservationState = { state: 'aborted', cleanupPending: true };
    mocks.abortPropertyScanUpload.mockImplementation(async () => ({
      scanId: target.scanId,
      uploadReservations: [{ ...target, ...reservationState }],
    }));
    mocks.listExpiredPropertyScanUploadReservations.mockResolvedValue([target]);
    mocks.completePropertyScanUploadCleanup.mockImplementation(async () => {
      reservationState.cleanupPending = false;
      return true;
    });
    mocks.readPropertyScanSession.mockImplementation(async () => ({
      scanId: target.scanId,
      uploadReservations: [{ ...target, ...reservationState }],
    }));
    mocks.remove.mockResolvedValue({ error: { message: 'temporary storage failure' } });
    mocks.storageFrom.mockReturnValue({ remove: mocks.remove });
  });

  it('persists a failed immediate cleanup and clears it only after a successful retry', async () => {
    const cancelled = await abortScanUpload(target.scanId, target.ownerId, target.uploadId);
    expect(cancelled?.uploadReservations[0]).toMatchObject({ state: 'aborted', cleanupPending: true });
    expect(mocks.completePropertyScanUploadCleanup).not.toHaveBeenCalled();

    mocks.remove.mockResolvedValueOnce({ error: null });
    const retried = await reconcileScanUploadReservations(10);

    expect(retried).toEqual({ inspected: 1, removed: 1, failed: 0 });
    expect(mocks.remove).toHaveBeenCalledTimes(2);
    expect(mocks.remove).toHaveBeenLastCalledWith(['owner-1/scan-1/upload-1-room.jpg']);
    expect(mocks.completePropertyScanUploadCleanup).toHaveBeenCalledWith(target);
    expect(reservationState.cleanupPending).toBe(false);
  });

  it('continues a bounded recovery batch when one Storage deletion fails', async () => {
    const secondTarget = { ...target, uploadId: 'upload-2', fileName: 'kitchen.jpg' };
    mocks.listExpiredPropertyScanUploadReservations.mockResolvedValue([target, secondTarget]);
    mocks.remove.mockImplementation(async ([path]: string[]) => ({
      error: path.includes('upload-1') ? { message: 'temporary storage failure' } : null,
    }));
    mocks.completePropertyScanUploadCleanup.mockResolvedValue(true);

    const result = await reconcileScanUploadReservations(2);

    expect(result).toEqual({ inspected: 2, removed: 1, failed: 1 });
    expect(mocks.listExpiredPropertyScanUploadReservations).toHaveBeenCalledWith(expect.any(Date), 2);
    expect(mocks.remove).toHaveBeenCalledTimes(2);
    expect(mocks.completePropertyScanUploadCleanup).toHaveBeenCalledTimes(1);
    expect(mocks.completePropertyScanUploadCleanup).toHaveBeenCalledWith(secondTarget);
  });
});
