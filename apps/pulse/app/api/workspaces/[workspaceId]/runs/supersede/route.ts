import { NextRequest } from 'next/server';
import { supersedeRun } from '@/lib/platform/workflows/runStore.server';
import { readWorkflowBody, workspaceWorkflowRequest, type WorkspaceRouteContext } from '@/lib/platform/workflows/http.server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export async function POST(request: NextRequest, context: WorkspaceRouteContext) {
  return workspaceWorkflowRequest(request, context, async (actor, workspace) => supersedeRun(actor, workspace, await readWorkflowBody(request)));
}
