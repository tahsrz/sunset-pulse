import { NextRequest } from 'next/server';
import { realtorApi, readRealtorBody } from '@/lib/realtor-workspace/http.server';
import { readOwnedSellerJourney } from '@/lib/realtor-workspace/leadStore.server';
import { actOnSellerCase, readSellerCase } from '@/lib/realtor-workspace/sellerService.server';
export const dynamic = 'force-dynamic';
export function GET(request: NextRequest) {
  return realtorApi(request, async (actor) => {
    const leadId = request.nextUrl.searchParams.get('leadId') || '';
    const result = await readSellerCase(actor, leadId);
    return { ...result, intake: await readOwnedSellerJourney(actor, result.lead.id) };
  });
}
export function POST(request: NextRequest) {
  return realtorApi(request, async (actor) => actOnSellerCase(actor, await readRealtorBody(request)), true);
}
