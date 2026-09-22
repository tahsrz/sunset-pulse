import { startAppLaunch } from '@/lib/platform/apps/appLaunch.server';
import { readWorkflowBody, workspaceWorkflowRequest, type WorkspaceRouteContext } from '@/lib/platform/workflows/http.server';
import { NextRequest } from 'next/server';

export async function POST(request: NextRequest, context: WorkspaceRouteContext) {
  return workspaceWorkflowRequest(request, context, async (actor, workspace) => startAppLaunch(actor, workspace, await readWorkflowBody(request)));
}
