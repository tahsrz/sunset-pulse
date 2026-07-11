import { NextRequest } from 'next/server';
import { z } from 'zod';
import { errorResponse, successResponse } from '@/lib/core/apiResponse';
import { isAuthResponse, requireOperatorRouteAccess } from '@/lib/core/routeAuth';
import { parseTourHotListTargets, resolveTourHotListTargets } from '@/lib/data/tourHotList';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const MAX_REQUEST_BYTES = 20_000;

const previewSchema = z.object({
  mlsIds: z.array(z.string().trim().min(1).max(120)).max(50).optional(),
  addresses: z.array(z.string().trim().min(1).max(260)).max(50).optional(),
  rawMlsIds: z.string().max(5_000).optional(),
  rawAddresses: z.string().max(10_000).optional(),
  limit: z.coerce.number().int().min(1).max(24).optional(),
}).strict();

// POST /api/admin/properties/hot-list/preview
export async function POST(request: NextRequest) {
  const access = await requireOperatorRouteAccess(request);
  if (isAuthResponse(access)) return access;

  try {
    const body = await readJsonBody(request, MAX_REQUEST_BYTES);
    const parsed = previewSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse('Invalid hot-list preview request.', 400, parsed.error.flatten());
    }

    const targets = parseTourHotListTargets(parsed.data);
    if (targets.length === 0) {
      return errorResponse('Add at least one MLS ID or address to preview.', 400);
    }

    const result = await resolveTourHotListTargets(targets, { limit: parsed.data.limit || 10 });

    return successResponse({
      endpoint: '/api/admin/properties/hot-list/preview',
      result,
    });
  } catch (error: any) {
    const status = error instanceof RequestBodyError ? error.status : 500;
    return errorResponse(
      status === 500 ? 'Failed to preview the Tour Studio hot list.' : error.message,
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
