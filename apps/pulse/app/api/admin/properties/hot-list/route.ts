import { NextRequest } from 'next/server';
import { z } from 'zod';
import { errorResponse, successResponse } from '@/lib/core/apiResponse';
import { isAuthResponse, operatorAuditUser, requireOperatorRouteAccess } from '@/lib/core/routeAuth';
import { getStoredTourHotList, saveStoredTourHotList } from '@/lib/data/tourHotListStore';
import { parseTourHotListTargets, resolveTourHotListTargets } from '@/lib/data/tourHotList';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const MAX_REQUEST_BYTES = 20_000;

const saveSchema = z.object({
  rawMlsIds: z.string().max(5_000).optional().default(''),
  rawAddresses: z.string().max(10_000).optional().default(''),
  limit: z.coerce.number().int().min(1).max(24).optional().default(10),
}).strict();

// GET /api/admin/properties/hot-list
export async function GET(request: NextRequest) {
  const access = await requireOperatorRouteAccess(request);
  if (isAuthResponse(access)) return access;

  const saved = await getStoredTourHotList();
  const result = saved?.targets.length
    ? await resolveTourHotListTargets(saved.targets, { limit: saved.limit })
    : null;

  return successResponse({
    endpoint: '/api/admin/properties/hot-list',
    saved,
    result,
  });
}

// PUT /api/admin/properties/hot-list
export async function PUT(request: NextRequest) {
  const access = await requireOperatorRouteAccess(request);
  if (isAuthResponse(access)) return access;

  try {
    const body = await readJsonBody(request, MAX_REQUEST_BYTES);
    const parsed = saveSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse('Invalid hot-list save request.', 400, parsed.error.flatten());
    }

    const targets = parseTourHotListTargets(parsed.data);
    if (targets.length === 0) {
      return errorResponse('Add at least one MLS ID or address before saving.', 400);
    }

    const result = await resolveTourHotListTargets(targets, { limit: parsed.data.limit });
    if (result.listings.length === 0) {
      return errorResponse('The saved hot list must resolve at least one active MLS listing with a secure image.', 400, {
        skipped: result.skipped,
        unresolved: result.unresolved,
      });
    }

    const saved = await saveStoredTourHotList({
      targets,
      rawMlsIds: parsed.data.rawMlsIds,
      rawAddresses: parsed.data.rawAddresses,
      limit: parsed.data.limit,
      updatedBy: operatorAuditUser(access),
    });

    return successResponse({
      endpoint: '/api/admin/properties/hot-list',
      saved,
      result,
    });
  } catch (error: any) {
    const status = error instanceof RequestBodyError ? error.status : 500;
    return errorResponse(
      status === 500 ? 'Failed to save the Tour Studio hot list.' : error.message,
      status,
      status === 500 ? error.message : null
    );
  }
}

class RequestBodyError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

async function readJsonBody(request: NextRequest, maxBytes: number) {
  const declaredLength = Number(request.headers.get('content-length') || 0);
  if (declaredLength > maxBytes) throw new RequestBodyError('Request body is too large.', 413);

  try {
    return await request.json();
  } catch {
    throw new RequestBodyError('Request body must be valid JSON.', 400);
  }
}
