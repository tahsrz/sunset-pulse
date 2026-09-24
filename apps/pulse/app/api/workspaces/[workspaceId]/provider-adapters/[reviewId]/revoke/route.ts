import { NextRequest } from 'next/server';
import { z } from 'zod';
import { revokeProviderAdapterReview } from '@/lib/platform/providers/providerQuota.server';
import { readWorkflowBody, workspaceWorkflowRequest, type WorkspaceRouteContext } from '@/lib/platform/workflows/http.server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type RouteContext = { params: Promise<{ workspaceId: string; reviewId: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  const { workspaceId, reviewId } = await context.params;
  const workspaceContext: WorkspaceRouteContext = { params: Promise.resolve({ workspaceId }) };
  return workspaceWorkflowRequest(request, workspaceContext, async (actor, workspace) => {
    const review = z.string().uuid().parse(reviewId);
    await readWorkflowBody(request);
    return revokeProviderAdapterReview(actor, workspace, review);
  });
}
