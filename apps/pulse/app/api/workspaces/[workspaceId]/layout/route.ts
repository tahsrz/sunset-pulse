import { NextRequest } from 'next/server';
import { getUserCanvasLayout, saveUserCanvasLayout } from '@/lib/platform/layouts/userLayoutStore.server';
import { readWorkflowBody, workspaceWorkflowRequest, type WorkspaceRouteContext } from '@/lib/platform/workflows/http.server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest, context: WorkspaceRouteContext) {
  return workspaceWorkflowRequest(request, context, (actor, workspace) => getUserCanvasLayout(actor, workspace));
}

export async function PUT(request: NextRequest, context: WorkspaceRouteContext) {
  return workspaceWorkflowRequest(request, context, async (actor, workspace) =>
    saveUserCanvasLayout(actor, workspace, await readWorkflowBody(request)));
}
