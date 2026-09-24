import { NextRequest } from 'next/server';
import { errorResponse, successResponse } from '@/lib/core/apiResponse';
import { isAuthResponse, requireOperatorRouteAccess } from '@/lib/core/routeAuth';
import { canReviewScan, scanActorFromOperatorAccess } from '@/lib/scans/scanAccess.server';
import { readPropertyScanSessionForActor, startPropertyScanReconstruction } from '@/lib/scans/propertyScanStore';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest, { params }: { params: Promise<{ scanId: string }> }) {
  const access = await requireOperatorRouteAccess(request);
  if (isAuthResponse(access)) return access;
  const { scanId } = await params;
  const actor = scanActorFromOperatorAccess(access);
  const session = await readPropertyScanSessionForActor(scanId, actor);
  if (!session) return errorResponse('Property scan session not found.', 404);
  if (!canReviewScan(session, actor)) return errorResponse('This scan is not assigned to the current reviewer.', 404);
  if (session.status !== 'approved') return errorResponse('Approve the capture before starting reconstruction.', 409);
  if (!session.assets.length) return errorResponse('Upload at least one private capture before starting reconstruction.', 400);
  if (session.reconstruction?.status === 'ready') return errorResponse('This is a legacy synthetic demo and cannot be reused as a property model.', 409, { code: 'LEGACY_SYNTHETIC_DEMO' });

  const updated = await startPropertyScanReconstruction(scanId);
  if (!updated) return errorResponse('The approved scan changed before reconstruction could start.', 409);
  if ('outcome' in updated && updated.outcome === 'unavailable') {
    return errorResponse(updated.message, 503, { code: updated.code });
  }
  return successResponse({ endpoint: `/api/admin/property-scans/${scanId}/reconstruct`, session: updated });
}
