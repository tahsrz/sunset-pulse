import { NextRequest } from 'next/server';
import { successResponse } from '@/lib/core/apiResponse';
import { isAuthResponse, requireOperatorRouteAccess } from '@/lib/core/routeAuth';
import { mlsService } from '@/lib/data/mls';
import { derivePipelineHealth } from '@/lib/data/pipelineHealth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const access = await requireOperatorRouteAccess(request);
  if (isAuthResponse(access)) return access;

  const sync = mlsService.getSyncSnapshot();
  return successResponse({
    endpoint: '/api/admin/mls/status',
    provider: mlsService.getActiveProviderName(),
    sync,
    health: derivePipelineHealth(sync),
  });
}
