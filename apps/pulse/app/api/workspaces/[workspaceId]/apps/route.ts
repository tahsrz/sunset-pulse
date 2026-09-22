import { NextRequest } from 'next/server';
import { listAppInstalls, saveAppInstall } from '@/lib/platform/apps/appInstallStore.server';
import { readWorkflowBody, workspaceWorkflowRequest, type WorkspaceRouteContext } from '@/lib/platform/workflows/http.server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export async function POST(request: NextRequest, context: WorkspaceRouteContext) {
  return workspaceWorkflowRequest(request, context, async (actor, workspace) => saveAppInstall(actor, workspace, await readWorkflowBody(request)));
}
export async function GET(request: NextRequest, context: WorkspaceRouteContext) {
  return workspaceWorkflowRequest(request, context, (actor, workspace) => listAppInstalls(actor, workspace));
}
