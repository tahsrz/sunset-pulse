import { NextRequest } from 'next/server';
import { errorResponse, successResponse } from '@/lib/core/apiResponse';
import { isAuthResponse, requireOperatorRouteAccess } from '@/lib/core/routeAuth';
import { routeOrchestratorCommand } from '@/lib/core/orchestrator_commands';
import { getOrchestratorSnapshot } from '@/lib/core/orchestrator_node';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const access = await requireOperatorRouteAccess(request);
  if (isAuthResponse(access)) return access;

  try {
    const body = await request.json();
    const result = routeOrchestratorCommand({
      text: body?.text || '',
      source: 'console',
      access
    });

    return successResponse({
      endpoint: '/api/admin/orchestrator/command',
      result,
      snapshot: getOrchestratorSnapshot(access)
    });
  } catch (error: any) {
    return errorResponse('Failed to route orchestrator command.', 500, error.message);
  }
}
