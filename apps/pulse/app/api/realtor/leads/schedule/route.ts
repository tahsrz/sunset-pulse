import { NextRequest } from 'next/server';
import { requirePersonalRealtorWorkspace } from '@/lib/realtor-workspace/access.server';
import { realtorApi } from '@/lib/realtor-workspace/http.server';
import { findOwnedSellerSchedule } from '@/lib/realtor-workspace/leadStore.server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export function GET(request: NextRequest) {
  return realtorApi(request, async (actorId) => {
    const { workspaceId } = await requirePersonalRealtorWorkspace(actorId);
    return findOwnedSellerSchedule(actorId, workspaceId, Object.fromEntries(request.nextUrl.searchParams.entries()));
  });
}
