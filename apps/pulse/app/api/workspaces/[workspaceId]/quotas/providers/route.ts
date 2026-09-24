import { NextRequest } from 'next/server';
import { listProviderQuotas, saveProviderQuota } from '@/lib/platform/providers/providerQuota.server';
import { readWorkflowBody, workspaceWorkflowRequest, type WorkspaceRouteContext } from '@/lib/platform/workflows/http.server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest, context: WorkspaceRouteContext) {
  return workspaceWorkflowRequest(request, context, listProviderQuotas);
}

export async function POST(request: NextRequest, context: WorkspaceRouteContext) {
  return workspaceWorkflowRequest(request, context, async (actor, workspace) =>
    saveProviderQuota(actor, workspace, await readWorkflowBody(request)));
}
