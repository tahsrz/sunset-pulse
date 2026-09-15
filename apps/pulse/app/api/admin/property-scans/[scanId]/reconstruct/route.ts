import { NextRequest } from 'next/server';
import { errorResponse, successResponse } from '@/lib/core/apiResponse';
import { isAuthResponse, requireOperatorRouteAccess } from '@/lib/core/routeAuth';
import { listAllPropertyScanSessions, startPropertyScanReconstruction } from '@/lib/scans/propertyScanStore';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest, { params }: { params: Promise<{ scanId: string }> }) {
  const access = await requireOperatorRouteAccess(request);
  if (isAuthResponse(access)) return access;
  const { scanId } = await params;
  const session = (await listAllPropertyScanSessions()).find((item) => item.scanId === scanId);
  if (!session) return errorResponse('Property scan session not found.', 404);
  if (session.status !== 'approved') return errorResponse('Approve the capture before starting reconstruction.', 409);
  if (!session.assets.length) return errorResponse('Upload at least one private capture before starting reconstruction.', 400);
  if (session.reconstruction?.status === 'ready') return successResponse({ endpoint: `/api/admin/property-scans/${scanId}/reconstruct`, session, reused: true });

  const updated = await startPropertyScanReconstruction(scanId);
  if (!updated) return errorResponse('The approved scan changed before reconstruction could start.', 409);
  return successResponse({ endpoint: `/api/admin/property-scans/${scanId}/reconstruct`, session: updated, previewUrl: `/admin/property-scans/${scanId}/preview` }, {}, 202);
}

