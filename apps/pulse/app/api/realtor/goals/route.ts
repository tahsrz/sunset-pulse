import { NextRequest } from 'next/server';
import { goalInputSchema } from '@/lib/realtor-workspace/contracts';
import { requirePersonalRealtorWorkspace } from '@/lib/realtor-workspace/access.server';
import { listGoals, saveGoal } from '@/lib/realtor-workspace/store.server';
import { realtorApi, readRealtorBody } from '@/lib/realtor-workspace/http.server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  return realtorApi(request, async (actorId) => {
    const year = Number(request.nextUrl.searchParams.get('year') || new Date().getFullYear());
    const { workspaceId } = await requirePersonalRealtorWorkspace(actorId);
    return listGoals(actorId, workspaceId, year);
  });
}

export async function POST(request: NextRequest) {
  return realtorApi(request, async (actorId) => {
    const body = await readRealtorBody(request);
    const id = typeof body === 'object' && body !== null && 'id' in body && typeof body.id === 'string' ? body.id : null;
    const archive = typeof body === 'object' && body !== null && 'archive' in body && body.archive === true;
    const input = goalInputSchema.parse(typeof body === 'object' && body !== null
      ? Object.fromEntries(Object.entries(body).filter(([key]) => !['id', 'archive'].includes(key)))
      : body);
    const { workspaceId } = await requirePersonalRealtorWorkspace(actorId);
    return saveGoal(actorId, workspaceId, { ...input, id, archive });
  }, true);
}
