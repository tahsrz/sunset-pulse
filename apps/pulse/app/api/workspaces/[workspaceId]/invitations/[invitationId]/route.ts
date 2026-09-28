import { NextRequest } from 'next/server';
import { z } from 'zod';
import { revokeWorkspaceInvitation } from '@/lib/platform/access/workspaceInvitations.server';
import { readWorkflowBody, workspaceWorkflowRequest, type WorkspaceRouteContext } from '@/lib/platform/workflows/http.server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type RouteContext = { params: Promise<{ workspaceId: string; invitationId: string }> };
const confirmationSchema = z.object({ confirm: z.literal(true) }).strict();

export async function DELETE(request: NextRequest, context: RouteContext) {
  const { workspaceId, invitationId } = await context.params;
  const workspaceContext: WorkspaceRouteContext = { params: Promise.resolve({ workspaceId }) };
  return workspaceWorkflowRequest(request, workspaceContext, async (actor, workspace) => {
    confirmationSchema.parse(await readWorkflowBody(request));
    return revokeWorkspaceInvitation(actor, workspace, invitationId);
  });
}
