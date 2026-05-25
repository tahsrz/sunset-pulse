import { NextRequest } from 'next/server';
import { errorResponse, successResponse } from '@/lib/core/apiResponse';
import { getOperatorAccess } from '@/lib/core/operator_access';
import { getOrchestratorSnapshot } from '@/lib/core/orchestrator_node';
import { handleTerminalIntentAction, type TerminalIntentAction } from '@/lib/core/orchestrator_terminal_runner';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const access = await getOperatorAccess(request.headers.get('host'));

  if (!access.allowed) {
    return errorResponse('Operator access denied.', 403, access.reason);
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const action = String(body?.action || '').trim() as TerminalIntentAction;

    if (!['approve', 'reject', 'run'].includes(action)) {
      return errorResponse('Unsupported terminal intent action.', 400, 'Use approve, reject, or run.');
    }

    const result = await handleTerminalIntentAction({
      id,
      action,
      operator: access.user?.email || access.user?.name || access.mode
    });

    return successResponse({
      endpoint: `/api/admin/orchestrator/terminal-intents/${id}`,
      result,
      snapshot: getOrchestratorSnapshot(access)
    }, {}, result.ok ? 200 : 409);
  } catch (error: any) {
    return errorResponse('Failed to update terminal intent.', 500, error.message);
  }
}
