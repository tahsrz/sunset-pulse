import { NextRequest } from 'next/server';
import { realtorApi, readRealtorBody } from '@/lib/realtor-workspace/http.server';
import { accessPropertyProfile } from '@/lib/realtor-workspace/propertyProfile.server';

export const dynamic = 'force-dynamic';

export function GET(request: NextRequest) {
  return realtorApi(request, actor => accessPropertyProfile(actor, request.nextUrl.searchParams.get('leadId') || ''));
}

export function POST(request: NextRequest) {
  return realtorApi(request, async actor => accessPropertyProfile(actor, request.nextUrl.searchParams.get('leadId') || '', await readRealtorBody(request)));
}
