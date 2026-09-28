import 'server-only';

import { z } from 'zod';
import {
  abortPropertyScanUpload,
  completePropertyScanUploadCleanup,
  finalizePropertyScanUpload,
  listExpiredPropertyScanUploadReservations,
  readPropertyScanSession,
  reservePropertyScanUpload,
} from './propertyScanStore';
import { propertyScanAssetLimits, propertyScanAssetMimeTypes, type PropertyScanAsset } from './propertyScanContract';
import { supabaseAdmin } from '@/lib/supabase';

const reservationInputSchema = z.object({
  idempotencyKey: z.string().trim().min(8).max(200),
  fileName: z.string().trim().min(1).max(255),
  mimeType: z.string().trim().refine((value) => propertyScanAssetMimeTypes.has(value), 'Unsupported capture type.'),
  declaredBytes: z.number().int().positive().max(propertyScanAssetLimits.maxBytesPerFile),
  expectedRevision: z.number().int().positive(),
});

export type ScanUploadReservationInput = z.infer<typeof reservationInputSchema>;

function isMockMode() {
  return process.env.NEXT_PUBLIC_MOCK_MODE === 'true';
}

export function parseScanUploadReservation(input: unknown) {
  return reservationInputSchema.parse(input);
}

export function reserveScanUpload(scanId: string, ownerId: string, input: ScanUploadReservationInput) {
  return reservePropertyScanUpload(scanId, ownerId, input);
}

export function propertyScanUploadPath(ownerId: string, scanId: string, reservation: { uploadId: string; fileName: string }) {
  const safeName = reservation.fileName.replace(/[^a-zA-Z0-9._-]/g, '-').slice(-160) || 'capture';
  return `${ownerId}/${scanId}/${reservation.uploadId}-${safeName}`;
}

export function finalizeScanUpload(scanId: string, ownerId: string, uploadId: string, asset: PropertyScanAsset, expectedRevision: number) {
  return finalizePropertyScanUpload(scanId, ownerId, uploadId, asset, expectedRevision);
}

export async function abortScanUpload(scanId: string, ownerId: string, uploadId: string) {
  const session = await abortPropertyScanUpload(scanId, ownerId, uploadId);
  const reservation = session?.uploadReservations.find((item) => item.uploadId === uploadId);
  if (!session || reservation?.state !== 'aborted' || !reservation.cleanupPending) return session;

  let removedFromStorage = isMockMode();
  if (!isMockMode() && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const path = propertyScanUploadPath(ownerId, scanId, reservation);
    try {
      const { error } = await supabaseAdmin.storage.from('property-scans').remove([path]);
      removedFromStorage = !error;
    } catch {
      removedFromStorage = false;
    }
  }
  if (!removedFromStorage) return session;

  await completePropertyScanUploadCleanup({
    scanId,
    ownerId,
    uploadId,
    fileName: reservation.fileName,
    mimeType: reservation.mimeType,
    cleanupPending: true,
  });
  return (await readPropertyScanSession(scanId, ownerId)) || session;
}

export async function reconcileScanUploadReservations(limit = 50) {
  const targets = await listExpiredPropertyScanUploadReservations(new Date(), limit);
  const mockMode = isMockMode();
  let removed = 0;
  let failed = 0;
  for (const target of targets) {
    let removedFromStorage = mockMode;
    if (!mockMode && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const path = propertyScanUploadPath(target.ownerId, target.scanId, target);
      try {
        const { error } = await supabaseAdmin.storage.from('property-scans').remove([path]);
        removedFromStorage = !error;
      } catch {
        removedFromStorage = false;
      }
    }
    if (!removedFromStorage) { failed += 1; continue; }
    if (await completePropertyScanUploadCleanup(target)) removed += 1;
  }
  return { inspected: targets.length, removed, failed };
}
