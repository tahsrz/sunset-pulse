import { NextRequest } from 'next/server';
import { registerReviewedProviderAdapter } from '@/lib/platform/providers/providerAdapter.server';
import { readWorkflowBody, workspaceWorkflowRequest, type WorkspaceRouteContext } from '@/lib/platform/workflows/http.server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type RouteContext = { params: Promise<{ workspaceId: string; connectionId: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  const { workspaceId, connectionId } = await context.params;
  const workspaceContext: WorkspaceRouteContext = { params: Promise.resolve({ workspaceId }) };
  return workspaceWorkflowRequest(request, workspaceContext, async (actor, workspace) =>
    registerReviewedProviderAdapter(actor, workspace, connectionId, await readWorkflowBody(request)));
}
