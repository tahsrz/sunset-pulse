import { NextRequest } from 'next/server';
import { z } from 'zod';
import { errorResponse, notFoundResponse, successResponse } from '@/lib/core/apiResponse';
import { isAuthResponse, operatorAuditUser, requireOperatorRouteAccess } from '@/lib/core/routeAuth';
import {
  getListingIntakePublishBlockers,
  ListingIntakeAccessError,
  ListingIntakeConflictError,
  ListingIntakePublishGateError,
  readListingIntake,
  updateListingIntake,
  type ListingIntakeSnapshot,
} from '@/lib/command-center/listingIntakeStore';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const paramsSchema = z.object({ intakeId: z.string().regex(/^li_[0-9a-f-]{36}$/) });
const updateSchema = z.object({
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
  expectedVersion: z.number().int().positive(),
});

export async function GET(request: NextRequest, { params }: { params: Promise<{ intakeId: string }> }) {
  const access = await requireOperatorRouteAccess(request);
  if (isAuthResponse(access)) return access;
  const parsed = paramsSchema.safeParse(await params);
  if (!parsed.success) return errorResponse('Invalid listing intake id.', 400);

  try {
    const intake = await readListingIntake(parsed.data.intakeId, operatorAuditUser(access).userId);
    if (!intake) return notFoundResponse('Listing intake');
    return successResponse({ endpoint: `/api/command-center/listing-intakes/${intake.intakeId}`, intake });
  } catch (error) {
    if (error instanceof ListingIntakeAccessError) return errorResponse(error.message, 403);
    return errorResponse('Failed to load listing intake.', 500);
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ intakeId: string }> }) {
  const access = await requireOperatorRouteAccess(request);
  if (isAuthResponse(access)) return access;
  const id = paramsSchema.safeParse(await params);
  if (!id.success) return errorResponse('Invalid listing intake id.', 400);

  try {
    const body = await safeJson(request);
    if (body === undefined) return errorResponse('Invalid JSON listing intake update request.', 400);

    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) return errorResponse('Invalid listing intake update.', 400, parsed.error.flatten());
    const { expectedVersion, ...snapshot } = parsed.data;
    const actor = operatorAuditUser(access);
    const intake = await updateListingIntake(
      id.data.intakeId,
      snapshot as ListingIntakeSnapshot,
      actor.userId,
      actor.email || actor.name || actor.userId,
      expectedVersion,
    );
    if (!intake) return notFoundResponse('Listing intake');
    return successResponse({
      endpoint: `/api/command-center/listing-intakes/${intake.intakeId}`,
      intake,
      publishGate: { blockers: getListingIntakePublishBlockers(snapshot as ListingIntakeSnapshot) },
    });
  } catch (error) {
    if (error instanceof ListingIntakeAccessError) return errorResponse(error.message, 403);
    if (error instanceof ListingIntakeConflictError) return errorResponse(error.message, 409);
    if (error instanceof ListingIntakePublishGateError) return errorResponse('Listing intake is not ready to publish.', 400, error.blockers);
    return errorResponse('Failed to update listing intake.', 500);
  }
}

async function safeJson(request: Request) {
  try {
    return await request.json();
  } catch {
    return undefined;
  }
}
