import { NextRequest } from 'next/server';
import { z } from 'zod';
import { requirePersonalRealtorWorkspace } from '@/lib/realtor-workspace/access.server';
import { readBusinessSummary } from '@/lib/realtor-workspace/store.server';
import { realtorApi } from '@/lib/realtor-workspace/http.server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export function GET(request: NextRequest) {
  return realtorApi(request, async (actorId) => {
    const year = z.coerce.number().int().min(2000).max(2200).parse(request.nextUrl.searchParams.get('year') || new Date().getFullYear());
    const { workspaceId } = await requirePersonalRealtorWorkspace(actorId);
    return readBusinessSummary(actorId, workspaceId, year);
  });
}
