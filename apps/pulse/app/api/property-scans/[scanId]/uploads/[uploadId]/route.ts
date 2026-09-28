import { NextRequest } from 'next/server';
import { isAuthResponse, requireSignedInUser } from '@/lib/core/routeAuth';
import { errorResponse, successResponse } from '@/lib/core/apiResponse';
import { abortScanUpload } from '@/lib/scans/scanUpload.server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ scanId: string; uploadId: string }> }) {
  const access = await requireSignedInUser(request);
  if (isAuthResponse(access)) return access;
  const { scanId, uploadId } = await params;
  const session = await abortScanUpload(scanId, access.user.id, uploadId);
  if (!session) return errorResponse('Upload reservation not found.', 404);
  return successResponse({ endpoint: `/api/property-scans/${scanId}/uploads/${uploadId}`, session });
}
