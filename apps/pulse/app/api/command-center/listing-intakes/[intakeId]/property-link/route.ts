import { NextRequest } from 'next/server';
import { z } from 'zod';
import { errorResponse, notFoundResponse, successResponse } from '@/lib/core/apiResponse';
import { isAuthResponse, operatorAuditUser, requireOperatorRouteAccess } from '@/lib/core/routeAuth';
import {
  CanonicalListingApplyError,
  CanonicalListingConflictError,
  CanonicalListingNotFoundError,
  applyListingIntakeToCanonicalProperty,
  compareListingIntakeToCanonicalProperty,
} from '@/lib/command-center/listingIntakePropertyHandoff';
import {
  ListingIntakeAccessError,
  ListingIntakeConflictError,
  ListingIntakePublishGateError,
} from '@/lib/command-center/listingIntakeStore';
import { listingIntakePropertyFields } from '@/lib/command-center/listingIntakePropertyDiff';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const paramsSchema = z.object({ intakeId: z.string().regex(/^li_[0-9a-f-]{36}$/) });
const applySchema = z.object({
  propertyId: z.string().trim().min(1).max(128),
  expectedPropertyLastUpdated: z.string().trim().min(1).nullable(),
  expectedIntakeVersion: z.number().int().positive(),
  fields: z.array(z.enum(listingIntakePropertyFields)).min(1).max(listingIntakePropertyFields.length),
});

export async function GET(request: NextRequest, { params }: { params: Promise<{ intakeId: string }> }) {
  const access = await requireOperatorRouteAccess(request);
  if (isAuthResponse(access)) return access;
  const parsed = paramsSchema.safeParse(await params);
  const propertyReference = new URL(request.url).searchParams.get('property')?.trim();
  if (!parsed.success || !propertyReference) return errorResponse('A valid listing intake and canonical property ID are required.', 400);

  try {
    const comparison = await compareListingIntakeToCanonicalProperty({
      intakeId: parsed.data.intakeId,
      ownerId: operatorAuditUser(access).userId,
      propertyReference,
    });
    if (!comparison) return notFoundResponse('Listing intake');
    return successResponse({ comparison });
  } catch (error) {
    return handoffErrorResponse(error, 'Failed to compare listing intake.');
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ intakeId: string }> }) {
  const access = await requireOperatorRouteAccess(request);
  if (isAuthResponse(access)) return access;
  const id = paramsSchema.safeParse(await params);
  if (!id.success) return errorResponse('Invalid listing intake id.', 400);
  const parsed = applySchema.safeParse(await request.json());
  if (!parsed.success) return errorResponse('Invalid canonical listing update.', 400, parsed.error.flatten());

  try {
    const actor = operatorAuditUser(access);
    const result = await applyListingIntakeToCanonicalProperty({
      intakeId: id.data.intakeId,
      ownerId: actor.userId,
      actor: actor.email || actor.name || actor.userId,
      propertyId: parsed.data.propertyId!,
      expectedPropertyLastUpdated: parsed.data.expectedPropertyLastUpdated!,
      expectedIntakeVersion: parsed.data.expectedIntakeVersion!,
      fields: parsed.data.fields!,
    });
    if (!result) return notFoundResponse('Listing intake');
    return successResponse(result);
  } catch (error) {
    return handoffErrorResponse(error, 'Failed to apply listing intake.');
  }
}

function handoffErrorResponse(error: unknown, fallback: string) {
  if (error instanceof ListingIntakeAccessError) return errorResponse(error.message, 403);
  if (error instanceof CanonicalListingNotFoundError) return errorResponse(error.message, 404);
  if (error instanceof ListingIntakeConflictError || error instanceof CanonicalListingConflictError) return errorResponse(error.message, 409);
  if (error instanceof ListingIntakePublishGateError || error instanceof CanonicalListingApplyError) return errorResponse(error.message, 400);
  return errorResponse(fallback, 500);
}
