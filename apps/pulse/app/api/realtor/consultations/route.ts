import { NextRequest } from 'next/server';
import { realtorApi,readRealtorBody } from '@/lib/realtor-workspace/http.server';
import { readSellerCalendar,saveSellerCalendar } from '@/lib/scheduling/sellerCalendar.server';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const GET = (request: NextRequest) => realtorApi(request,actor=>readSellerCalendar(actor,request.nextUrl.searchParams.get('agentId')||undefined));
export const POST = (request: NextRequest) => realtorApi(request,async actor=>saveSellerCalendar(actor,await readRealtorBody(request)));
