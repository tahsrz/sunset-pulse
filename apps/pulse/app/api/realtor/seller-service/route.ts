import { NextRequest } from 'next/server';
import { realtorApi, readRealtorBody } from '@/lib/realtor-workspace/http.server';
import { actOnSellerCase, readSellerCase } from '@/lib/realtor-workspace/sellerService.server';
export const dynamic = 'force-dynamic';
export function GET(request: NextRequest) {
  return realtorApi(request, (actor) => readSellerCase(actor, request.nextUrl.searchParams.get('leadId') || ''));
}
export function POST(request: NextRequest) {
  return realtorApi(request, async (actor) => actOnSellerCase(actor, await readRealtorBody(request)), true);
}
