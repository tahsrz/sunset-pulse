import { NextRequest } from 'next/server';
import { errorResponse, successResponse } from '@/lib/core/apiResponse';
import { getOperatorAccess } from '@/lib/core/operator_access';
import { getOrchestratorSnapshot } from '@/lib/core/orchestrator_node';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const access = await getOperatorAccess(request.headers.get('host'));

  if (!access.allowed) {
    return errorResponse('Operator access denied.', 403, access.reason);
  }

  return successResponse({
    endpoint: '/api/admin/orchestrator/status',
    snapshot: getOrchestratorSnapshot(access)
  });
}
