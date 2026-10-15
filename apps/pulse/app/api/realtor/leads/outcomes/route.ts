import { NextRequest } from 'next/server';
import { requirePersonalRealtorWorkspace } from '@/lib/realtor-workspace/access.server';
import { realtorApi } from '@/lib/realtor-workspace/http.server';
import { listOwnedSellerOutcomes } from '@/lib/realtor-workspace/leadStore.server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export function GET(request: NextRequest) {
  return realtorApi(request, async (actorId) => {
    await requirePersonalRealtorWorkspace(actorId);
    return listOwnedSellerOutcomes(actorId, Object.fromEntries(request.nextUrl.searchParams.entries()));
  });
}
