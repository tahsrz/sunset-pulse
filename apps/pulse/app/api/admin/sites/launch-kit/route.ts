import { NextRequest } from 'next/server';
import { z } from 'zod';
import { errorResponse, successResponse } from '@/lib/core/apiResponse';
import { isAuthResponse, operatorAuditUser, requireOperatorRouteAccess } from '@/lib/core/routeAuth';
import connectDB from '@/lib/core/database';
import { normalizeAgentId } from '@/lib/sites/agentConfig';
import {
  agentLaunchKitSchema,
  createDefaultLaunchKit,
  getLaunchKitSummary,
  normalizeLaunchKit,
} from '@/lib/sites/launchKit';
import { readSiteConfig, saveSiteConfig } from '@/lib/sites/siteConfigStore';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const MAX_REQUEST_BYTES = 50_000;

const querySchema = z.object({
  agentId: z.string().trim().optional(),
});

export async function GET(request: NextRequest) {
  const access = await requireOperatorRouteAccess(request);
  if (isAuthResponse(access)) return access;

  const parsed = querySchema.safeParse({
    agentId: request.nextUrl.searchParams.get('agentId') || undefined,
  });
  if (!parsed.success) {
    return errorResponse('Invalid launch-kit lookup request.', 400, parsed.error.flatten());
  }

  const agentId = normalizeAgentId(parsed.data.agentId) || undefined;
  const row = await readSiteConfig(agentId);
  const kit = row ? normalizeLaunchKit(row, agentId) : createDefaultLaunchKit(agentId);

  return successResponse({
    endpoint: '/api/admin/sites/launch-kit',
    ...getLaunchKitSummary(kit),
  });
}

export async function PUT(request: NextRequest) {
  const access = await requireOperatorRouteAccess(request);
  if (isAuthResponse(access)) return access;

  try {
    const body = await readJsonBody(request, MAX_REQUEST_BYTES);
    const parsed = agentLaunchKitSchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse('Invalid launch-kit profile.', 400, parsed.error.flatten());
    }

    const kit = normalizeLaunchKit(parsed.data);
    const summary = getLaunchKitSummary(kit);

    if (kit.status === 'active' && !summary.readyToPublish) {
      return errorResponse(
        'Launch kit is not buyer-safe to publish.',
        400,
        summary.publishGate.checks.filter((check) => !check.complete),
      );
    }

    const updatedBy = operatorAuditUser(access);
    const savedStores = await saveSiteConfig(kit, updatedBy);

    return successResponse({
      endpoint: '/api/admin/sites/launch-kit',
      savedStores,
      ...summary,
    });
  } catch (error: any) {
    const status = error instanceof RequestBodyError ? error.status : 500;
    return errorResponse(
      status === 500 ? 'Failed to save agent launch kit.' : error.message,
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
