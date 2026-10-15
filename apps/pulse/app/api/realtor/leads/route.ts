import { NextRequest } from 'next/server';
import { requirePersonalRealtorWorkspace } from '@/lib/realtor-workspace/access.server';
import { realtorApi, readRealtorBody } from '@/lib/realtor-workspace/http.server';
import { listOwnedSellerLeads, recordOwnedSellerLeadAction } from '@/lib/realtor-workspace/leadStore.server';
import { sellerLeadPageSchema } from '@/lib/realtor-workspace/leadContracts';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export function GET(request: NextRequest) {
  return realtorApi(request, async (actorId) => {
    await requirePersonalRealtorWorkspace(actorId);
    const raw = Object.fromEntries(request.nextUrl.searchParams.entries());
    const page = sellerLeadPageSchema.parse(raw);
    return listOwnedSellerLeads(actorId, page);
  });
}

export function POST(request: NextRequest) {
  return realtorApi(request, async (actorId) => {
    await requirePersonalRealtorWorkspace(actorId);
    return recordOwnedSellerLeadAction(actorId, await readRealtorBody(request));
  }, true);
}
