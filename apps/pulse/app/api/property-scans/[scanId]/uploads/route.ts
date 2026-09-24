import { NextRequest } from 'next/server';
import { isAuthResponse, requireSignedInUser } from '@/lib/core/routeAuth';
import { errorResponse, successResponse } from '@/lib/core/apiResponse';
import { readPropertyScanSession } from '@/lib/scans/propertyScanStore';
import { parseScanUploadReservation, propertyScanUploadPath, reserveScanUpload, abortScanUpload } from '@/lib/scans/scanUpload.server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest, { params }: { params: Promise<{ scanId: string }> }) {
  const access = await requireSignedInUser(request);
  if (isAuthResponse(access)) return access;
  const { scanId } = await params;
  if (!await readPropertyScanSession(scanId, access.user.id)) return errorResponse('Private scan session not found.', 404);

  try {
    const input = parseScanUploadReservation(await request.json());
    const session = await reserveScanUpload(scanId, access.user.id, input);
    if (!session) return errorResponse('The capture session changed or its upload quota is full. Refresh and retry.', 409);
    const reservation = session.uploadReservations.find((item) => item.idempotencyKey === input.idempotencyKey);
    if (!reservation) return errorResponse('Upload reservation was not returned.', 500);
    if (reservation.state !== 'pending') return errorResponse('This upload attempt is no longer active. Retry with a new upload attempt.', 409);
    const path = propertyScanUploadPath(access.user.id, scanId, reservation);
    if (process.env.NEXT_PUBLIC_MOCK_MODE === 'true') {
      return successResponse({ endpoint: `/api/property-scans/${scanId}/uploads`, reservation, sessionRevision: session.revision, upload: { path, mode: 'mock' } });
    }
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return errorResponse('Private capture storage is not configured.', 503);
    const { data, error } = await supabaseAdmin.storage.from('property-scans').createSignedUploadUrl(path, { upsert: false });
    if (error || !data) {
      await abortScanUpload(scanId, access.user.id, reservation.uploadId);
      return errorResponse('Unable to create a private upload capability.', 502, error?.message);
    }
    return successResponse({ endpoint: `/api/property-scans/${scanId}/uploads`, reservation, sessionRevision: session.revision, upload: { path, signedUrl: data.signedUrl, token: data.token } });
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : 'Invalid upload reservation.', 400);
  }
}
