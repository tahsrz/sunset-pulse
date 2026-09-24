import { NextRequest } from 'next/server';
import { createWorkspaceInvitation, listWorkspaceInvitations } from '@/lib/platform/access/workspaceInvitations.server';
import { readWorkflowBody, workspaceWorkflowRequest, type WorkspaceRouteContext } from '@/lib/platform/workflows/http.server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest, context: WorkspaceRouteContext) {
  return workspaceWorkflowRequest(request, context, listWorkspaceInvitations);
}

export async function POST(request: NextRequest, context: WorkspaceRouteContext) {
  return workspaceWorkflowRequest(request, context, async (actor, workspace) =>
    createWorkspaceInvitation(actor, workspace, await readWorkflowBody(request)));
}
