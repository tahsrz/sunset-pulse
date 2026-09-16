import { NextRequest } from 'next/server';
import { isAuthResponse, requireSignedInUser } from '@/lib/core/routeAuth';
import { errorResponse, successResponse } from '@/lib/core/apiResponse';
import { propertyScanAssetSchema } from '@/lib/scans/propertyScanContract';
import { readPropertyScanSession } from '@/lib/scans/propertyScanStore';
import { abortScanUpload, finalizeScanUpload, propertyScanUploadPath } from '@/lib/scans/scanUpload.server';
import { inspectPropertyScanUpload, type PropertyScanUploadIntegrity } from '@/lib/scans/propertyScanUploadIntegrity';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest, { params }: { params: Promise<{ scanId: string; uploadId: string }> }) {
  const access = await requireSignedInUser(request);
  if (isAuthResponse(access)) return access;
  const { scanId, uploadId } = await params;
  const session = await readPropertyScanSession(scanId, access.user.id);
  if (!session) return errorResponse('Private scan session not found.', 404);
  const reservation = session.uploadReservations.find((item) => item.uploadId === uploadId);
  if (!reservation) return errorResponse('Upload reservation not found.', 404);
  if (reservation.state === 'finalized') return successResponse({ endpoint: `/api/property-scans/${scanId}/uploads/${uploadId}/complete`, session });
  if (reservation.state !== 'pending') return errorResponse('Upload reservation is no longer active.', 409);
  if (process.env.NEXT_PUBLIC_MOCK_MODE !== 'true' && !process.env.SUPABASE_SERVICE_ROLE_KEY) return errorResponse('Private capture storage is not configured.', 503);

  try {
    const path = propertyScanUploadPath(access.user.id, scanId, reservation);
    const storage = process.env.NEXT_PUBLIC_MOCK_MODE === 'true' ? null : supabaseAdmin.storage.from('property-scans');
    const rejectUploadedObject = async () => {
      if (storage) await storage.remove([path]);
      await abortScanUpload(scanId, access.user.id, uploadId);
    };
    let actualSize = reservation.declaredBytes;
    let actualMimeType = reservation.mimeType;
    let contentHash: string | undefined;
    if (process.env.NEXT_PUBLIC_MOCK_MODE !== 'true') {
      const { data: info, error: infoError } = await storage!.info(path);
      if (infoError || !info) return errorResponse('Uploaded capture could not be inspected.', 502, infoError?.message);
      actualSize = Number(info.size);
      actualMimeType = String((info as { contentType?: string; mimetype?: string }).contentType || (info as { mimetype?: string }).mimetype || '').toLowerCase();
      if (actualSize !== reservation.declaredBytes || actualMimeType !== reservation.mimeType) {
        await rejectUploadedObject();
        return errorResponse('Uploaded capture metadata does not match its reservation.', 409);
      }
      const { data: file, error: downloadError } = await storage!.download(path);
      if (downloadError || !file) return errorResponse('Uploaded capture could not be read for integrity validation.', 502, downloadError?.message);
      let integrity: PropertyScanUploadIntegrity;
      try {
        integrity = inspectPropertyScanUpload({ bytes: new Uint8Array(await file.arrayBuffer()), expectedBytes: reservation.declaredBytes, expectedMimeType: reservation.mimeType });
      } catch (error) {
        await rejectUploadedObject();
        return errorResponse(error instanceof Error ? error.message : 'Uploaded capture failed integrity validation.', 422);
      }
      actualSize = integrity.size;
      actualMimeType = integrity.mimeType;
      contentHash = integrity.contentHash;
    }
    if (!Number.isInteger(actualSize) || actualSize !== reservation.declaredBytes) return errorResponse('Uploaded capture size does not match its reservation.', 409);
    if (actualMimeType !== reservation.mimeType) return errorResponse('Uploaded capture type does not match its reservation.', 409);
    const asset = propertyScanAssetSchema.parse({ assetId: reservation.assetId, path, fileName: reservation.fileName, mimeType: reservation.mimeType, size: actualSize, contentHash, capturedAt: null, uploadedAt: new Date().toISOString() });
    const finalized = await finalizeScanUpload(scanId, access.user.id, uploadId, asset, reservation.expectedRevision);
    if (!finalized) {
      await rejectUploadedObject();
      return errorResponse('Capture changed before finalization. Refresh the private session and retry.', 409);
    }
    return successResponse({ endpoint: `/api/property-scans/${scanId}/uploads/${uploadId}/complete`, session: finalized });
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : 'Unable to finalize private capture.', 400);
  }
}
