import { NextRequest } from 'next/server';
import { createEffectRetryIntent } from '@/lib/platform/workflows/exceptionRecovery.server';
import { readWorkflowBody, workspaceWorkflowRequest, type WorkspaceRouteContext } from '@/lib/platform/workflows/http.server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type RouteContext = { params: Promise<{ workspaceId: string; receiptId: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  const { workspaceId, receiptId } = await context.params;
  const workspaceContext: WorkspaceRouteContext = { params: Promise.resolve({ workspaceId }) };
  return workspaceWorkflowRequest(request, workspaceContext, async (actor, workspace) =>
    createEffectRetryIntent(actor, workspace, receiptId, await readWorkflowBody(request)));
}
