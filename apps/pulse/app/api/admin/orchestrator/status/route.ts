import { NextRequest } from 'next/server';
import { successResponse } from '@/lib/core/apiResponse';
import { isAuthResponse, requireOperatorRouteAccess } from '@/lib/core/routeAuth';
import { getOrchestratorSnapshot } from '@/lib/core/orchestrator_node';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const access = await requireOperatorRouteAccess(request);
  if (isAuthResponse(access)) return access;

  return successResponse({
    endpoint: '/api/admin/orchestrator/status',
    snapshot: getOrchestratorSnapshot(access)
  });
}
