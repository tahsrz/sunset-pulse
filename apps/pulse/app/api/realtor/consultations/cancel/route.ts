import { NextRequest } from 'next/server';
import { realtorApi,readRealtorBody } from '@/lib/realtor-workspace/http.server';
import { cancelSellerConsultation } from '@/lib/scheduling/sellerCalendar.server';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const POST = (request: NextRequest) => realtorApi(request,async actor=>cancelSellerConsultation(actor,await readRealtorBody(request)));
