import { NextRequest } from 'next/server';
import { getQuotaBudget, saveQuotaBudget } from '@/lib/platform/quotas/quotaBudget.server';
import { readWorkflowBody, workspaceWorkflowRequest, type WorkspaceRouteContext } from '@/lib/platform/workflows/http.server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest, context: WorkspaceRouteContext) {
  return workspaceWorkflowRequest(request, context, getQuotaBudget);
}

export async function PATCH(request: NextRequest, context: WorkspaceRouteContext) {
  return workspaceWorkflowRequest(request, context, async (actor, workspace) =>
    saveQuotaBudget(actor, workspace, await readWorkflowBody(request)));
}
