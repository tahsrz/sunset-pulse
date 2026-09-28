import { NextRequest } from 'next/server';
import { getRun } from '@/lib/platform/workflows/runStore.server';
import { workspaceWorkflowRequest } from '@/lib/platform/workflows/http.server';

type RunRouteContext = { params: Promise<{ workspaceId: string; runId: string }> };

export async function GET(request: NextRequest, context: RunRouteContext) {
  return workspaceWorkflowRequest(request, context, async (actor, workspace) => {
    const { runId } = await context.params;
    return getRun(actor, workspace, runId);
  });
}
