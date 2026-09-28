import { NextRequest } from 'next/server';
import { scheduleConnectorHealthCheck } from '@/lib/platform/workflows/connectorHealthSchedule.server';
import { readWorkflowBody, workspaceWorkflowRequest, type WorkspaceRouteContext } from '@/lib/platform/workflows/http.server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest, context: WorkspaceRouteContext) {
  return workspaceWorkflowRequest(request, context, async (actor, workspace) =>
    scheduleConnectorHealthCheck(actor, workspace, await readWorkflowBody(request)));
}
