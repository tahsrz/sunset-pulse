import { NextRequest } from 'next/server';
import { resolveProviderException } from '@/lib/platform/workflows/exceptionRecovery.server';
import { readWorkflowBody, workspaceWorkflowRequest, type WorkspaceRouteContext } from '@/lib/platform/workflows/http.server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type RouteContext = { params: Promise<{ workspaceId: string; exceptionId: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  const { workspaceId, exceptionId } = await context.params;
  const workspaceContext: WorkspaceRouteContext = { params: Promise.resolve({ workspaceId }) };
  return workspaceWorkflowRequest(request, workspaceContext, async (actor, workspace) =>
    resolveProviderException(actor, workspace, exceptionId, await readWorkflowBody(request)));
}
