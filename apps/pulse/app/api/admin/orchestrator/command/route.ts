import { NextRequest } from 'next/server';
import { errorResponse, successResponse } from '@/lib/core/apiResponse';
import { getOperatorAccess } from '@/lib/core/operator_access';
import { routeOrchestratorCommand } from '@/lib/core/orchestrator_commands';
import { getOrchestratorSnapshot } from '@/lib/core/orchestrator_node';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const access = await getOperatorAccess(request.headers.get('host'));

  if (!access.allowed) {
    return errorResponse('Operator access denied.', 403, access.reason);
  }

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
