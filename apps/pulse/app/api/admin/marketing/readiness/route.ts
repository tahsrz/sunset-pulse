import { NextRequest, NextResponse } from 'next/server';
import { isAuthResponse } from '@/lib/core/routeAuth';
import { requireMarketingCopyAccess } from '@/lib/marketing/marketingCopyAccess.server';
import { loadPublicationReadiness } from '@/lib/marketing/publicationReadiness.server';

export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control': 'private, no-store' };

export async function GET(request: NextRequest) {
  const access = await requireMarketingCopyAccess(request);
  if (isAuthResponse(access)) return access;
  try {
    return NextResponse.json(loadPublicationReadiness(), { headers });
  } catch {
    return NextResponse.json({ error: 'Content readiness could not be checked.' }, { status: 503, headers });
  }
}
