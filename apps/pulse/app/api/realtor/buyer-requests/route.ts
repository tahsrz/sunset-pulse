import { NextRequest } from 'next/server';
import { z } from 'zod';
import { requirePersonalRealtorWorkspace } from '@/lib/realtor-workspace/access.server';
import { readOwnedBuyerRequests } from '@/lib/realtor-workspace/buyerRequestStore.server';
import { realtorApi } from '@/lib/realtor-workspace/http.server';

export const dynamic = 'force-dynamic';
const query = z.object({ requestId: z.string().guid().optional() }).strict();

export function GET(request: NextRequest) {
  return realtorApi(request, async (actor) => {
    const { requestId } = query.parse(Object.fromEntries(request.nextUrl.searchParams));
    await requirePersonalRealtorWorkspace(actor);
    return readOwnedBuyerRequests(actor, requestId);
  });
}
