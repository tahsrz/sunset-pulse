import { NextRequest } from 'next/server';
import { plannerItemSaveSchema, plannerMaterializeSchema, plannerOccurrenceCursorSchema, plannerProjectionCursorSchema, plannerQuerySchema } from '@/lib/realtor-workspace/contracts';
import { requirePersonalRealtorWorkspace } from '@/lib/realtor-workspace/access.server';
import { listPlannerOccurrences, materializePlannerOccurrence, projectPlannerOccurrences, savePlannerItem } from '@/lib/realtor-workspace/store.server';
import { realtorApi, readRealtorBody } from '@/lib/realtor-workspace/http.server';
import { RealtorWorkspaceError } from '@/lib/realtor-workspace/access.server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  return realtorApi(request, async (actorId) => {
    const parsed = plannerQuerySchema.parse({
      from: request.nextUrl.searchParams.get('from'),
      through: request.nextUrl.searchParams.get('through'),
      status: request.nextUrl.searchParams.get('status') || undefined,
      cursor: request.nextUrl.searchParams.get('cursor') || undefined,
      projectionCursor: request.nextUrl.searchParams.get('projectionCursor') || undefined,
      limit: request.nextUrl.searchParams.get('limit') || undefined,
    });
    const { workspaceId } = await requirePersonalRealtorWorkspace(actorId);
    let cursor: { date: string; id: string; workspaceId: string; from: string; through: string; status: string } | undefined;
    if (parsed.cursor) {
      try { cursor = plannerOccurrenceCursorSchema.parse(JSON.parse(Buffer.from(parsed.cursor, 'base64url').toString('utf8'))); }
      catch { throw new RealtorWorkspaceError('INVALID'); }
    }
    const result = await listPlannerOccurrences(actorId, workspaceId, { ...parsed, cursor });
    let projectionCursor: { itemId: string; afterDate: string; workspaceId: string; from: string; through: string } | undefined;
    if (parsed.projectionCursor) {
      try { projectionCursor = plannerProjectionCursorSchema.parse(JSON.parse(Buffer.from(parsed.projectionCursor, 'base64url').toString('utf8'))); }
      catch { throw new RealtorWorkspaceError('INVALID'); }
    }
    const projections = await projectPlannerOccurrences(actorId, workspaceId, { ...parsed, cursor: projectionCursor });
    return {
      ...result,
      nextCursor: result.nextCursor ? Buffer.from(JSON.stringify(result.nextCursor)).toString('base64url') : null,
      projected: projections.items,
      projectionsTruncated: projections.truncated,
      nextProjectionCursor: projections.nextCursor ? Buffer.from(JSON.stringify(projections.nextCursor)).toString('base64url') : null,
    };
  });
}

export async function POST(request: NextRequest) {
  return realtorApi(request, async (actorId) => {
    const body = await readRealtorBody(request);
    const { workspaceId } = await requirePersonalRealtorWorkspace(actorId);
    if (typeof body === 'object' && body !== null && 'action' in body && body.action === 'materialize_occurrence') {
      const input = plannerMaterializeSchema.parse(body);
      return materializePlannerOccurrence(actorId, workspaceId, input);
    }
    const input = plannerItemSaveSchema.parse(body);
    return savePlannerItem(actorId, workspaceId, input);
  }, true);
}
