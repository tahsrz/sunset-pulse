import { NextRequest } from 'next/server';
import { z } from 'zod';
import { errorResponse, successResponse } from '@/lib/core/apiResponse';
import { isAuthResponse, requireSignedInUser } from '@/lib/core/routeAuth';
import { readPropertyScanSession, updatePropertyScanReviewers } from '@/lib/scans/propertyScanStore';

export const dynamic = 'force-dynamic';

const reviewersSchema = z.object({
  reviewerIds: z.array(z.string().trim().min(1).max(128)).max(20),
  expectedRevision: z.number().int().positive(),
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ scanId: string }> }) {
  const access = await requireSignedInUser(request);
  if (isAuthResponse(access)) return access;
  const { scanId } = await params;

  try {
    const parsed = reviewersSchema.safeParse(await request.json());
    if (!parsed.success) return errorResponse('Provide up to 20 valid reviewer user IDs and the current session revision.', 400, parsed.error.flatten());

    const existing = await readPropertyScanSession(scanId, access.user.id);
    if (!existing) return errorResponse('Property scan session not found.', 404);

    const session = await updatePropertyScanReviewers(scanId, access.user.id, parsed.data.reviewerIds, parsed.data.expectedRevision);
    if (!session) return errorResponse('This scan changed while reviewer access was being updated. Reload the session and try again.', 409);

    return successResponse({ endpoint: `/api/property-scans/${scanId}/reviewers`, session });
  } catch {
    return errorResponse('Unable to update property scan reviewers.', 500);
  }
}
