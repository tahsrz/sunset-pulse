import { NextRequest } from 'next/server';
import { listWorkspaceMembers, revokeWorkspaceMembership } from '@/lib/platform/access/workspaceInvitations.server';
import { readWorkflowBody, workspaceWorkflowRequest, type WorkspaceRouteContext } from '@/lib/platform/workflows/http.server';
import { z } from 'zod';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const revokeSchema = z.object({ membershipId: z.string().uuid() }).strict();

export async function GET(request: NextRequest, context: WorkspaceRouteContext) {
  return workspaceWorkflowRequest(request, context, listWorkspaceMembers);
}

export async function DELETE(request: NextRequest, context: WorkspaceRouteContext) {
  return workspaceWorkflowRequest(request, context, async (actor, workspace) => {
    const { membershipId } = revokeSchema.parse(await readWorkflowBody(request));
    return revokeWorkspaceMembership(actor, workspace, membershipId);
  });
}
