import { NextRequest } from 'next/server';
import { listCheckpoints, respondToCheckpoint } from '@/lib/platform/workflows/runStore.server';
import { readWorkflowBody, workspaceWorkflowRequest, type WorkspaceRouteContext } from '@/lib/platform/workflows/http.server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest, context: WorkspaceRouteContext) {
  return workspaceWorkflowRequest(request, context, (actor, workspace) => listCheckpoints(actor, workspace));
}
export async function POST(request: NextRequest, context: WorkspaceRouteContext) {
  return workspaceWorkflowRequest(request, context, async (actor, workspace) => respondToCheckpoint(actor, workspace, await readWorkflowBody(request)));
}
