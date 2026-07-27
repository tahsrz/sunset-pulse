import { NextRequest } from 'next/server';
import { z } from 'zod';
import { errorResponse, successResponse } from '@/lib/core/apiResponse';
import { isAuthResponse, operatorAuditUser, requireOperatorRouteAccess } from '@/lib/core/routeAuth';
import {
  createListingIntake,
  getListingIntakePublishBlockers,
  ListingIntakePublishGateError,
  type ListingIntakeSnapshot,
} from '@/lib/command-center/listingIntakeStore';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const snapshotSchema = z.object({
  sourceCommand: z.string().trim().min(1).max(20_000),
  approvedFacts: z.record(z.unknown()),
  drafts: z.object({
    mls: z.string().max(12_000),
    social: z.string().max(12_000),
    buyer: z.string().max(12_000),
  }),
  publishStatus: z.enum(['review', 'ready']),
  warnings: z.array(z.string().max(500)).max(20),
  missingFields: z.array(z.string().max(100)).max(20),
});

export async function POST(request: NextRequest) {
  const access = await requireOperatorRouteAccess(request);
  if (isAuthResponse(access)) return access;

  try {
    const parsed = snapshotSchema.safeParse(await request.json());
    if (!parsed.success) return errorResponse('Invalid listing intake.', 400, parsed.error.flatten());

    const snapshot = parsed.data as ListingIntakeSnapshot;
    const actor = operatorAuditUser(access);
    const intake = await createListingIntake(snapshot, actor.userId, actor.email || actor.name || actor.userId);
    return successResponse({
      endpoint: '/api/command-center/listing-intakes',
      intake,
      publishGate: { blockers: getListingIntakePublishBlockers(snapshot) },
    }, {}, 201);
  } catch (error) {
    if (error instanceof ListingIntakePublishGateError) {
      return errorResponse('Listing intake is not ready to publish.', 400, error.blockers);
    }
    return errorResponse('Failed to save listing intake.', 500);
  }
}
