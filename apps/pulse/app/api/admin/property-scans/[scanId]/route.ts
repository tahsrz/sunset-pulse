import { NextRequest } from 'next/server';
import { z } from 'zod';
import { errorResponse, successResponse } from '@/lib/core/apiResponse';
import { isAuthResponse, operatorAuditUser, requireOperatorRouteAccess } from '@/lib/core/routeAuth';
import { canReviewScan, scanActorFromOperatorAccess } from '@/lib/scans/scanAccess.server';
import { readPropertyScanSessionForActor, updatePropertyScanReview } from '@/lib/scans/propertyScanStore';

export const dynamic = 'force-dynamic';

const reviewSchema = z.object({
  status: z.enum(['in_review', 'approved', 'rejected']),
  reviewNote: z.string().trim().max(2000).optional().or(z.literal('')),
  expectedRevision: z.number().int().positive(),
  expectedManifestHash: z.string().trim().length(64),
  mediaInspectionAcknowledged: z.boolean().default(false),
});

export async function GET(request: NextRequest, { params }: { params: Promise<{ scanId: string }> }) {
  const access = await requireOperatorRouteAccess(request);
  if (isAuthResponse(access)) return access;
  const { scanId } = await params;
  const actor = scanActorFromOperatorAccess(access);
  const session = await readPropertyScanSessionForActor(scanId, actor);
  if (!session) return errorResponse('Property scan session not found.', 404);
  return successResponse({ endpoint: `/api/admin/property-scans/${scanId}`, session });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ scanId: string }> }) {
  const access = await requireOperatorRouteAccess(request);
  if (isAuthResponse(access)) return access;
  const { scanId } = await params;
  const actor = scanActorFromOperatorAccess(access);

  try {
    const parsed = reviewSchema.safeParse(await request.json());
    if (!parsed.success) return errorResponse('Choose a valid scan review status.', 400, parsed.error.flatten());
    const queueSession = await readPropertyScanSessionForActor(scanId, actor);
    if (!queueSession) return errorResponse('Property scan session not found.', 404);
    if (!canReviewScan(queueSession, actor)) return errorResponse('This scan is not assigned to the current reviewer.', 404);
    if (parsed.data.status === 'approved' && queueSession.assets.length === 0) {
      return errorResponse('Upload at least one private capture before approving this session.', 400);
    }
    if (parsed.data.status === 'approved' && !parsed.data.mediaInspectionAcknowledged) {
      return errorResponse('Confirm that the exact private media revision was inspected before approving this session.', 400);
    }

    const reviewer = operatorAuditUser(access);
    const session = await updatePropertyScanReview(scanId, parsed.data.status, reviewer.userId, parsed.data.reviewNote || null, parsed.data.expectedRevision, parsed.data.expectedManifestHash);
    if (!session) return errorResponse('Property scan session disappeared while updating review.', 409);
    return successResponse({ endpoint: `/api/admin/property-scans/${scanId}`, session });
  } catch {
    return errorResponse('Unable to update property scan review.', 500);
  }
}
