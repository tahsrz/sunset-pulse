import { NextRequest, NextResponse } from 'next/server';
import { isAuthResponse } from '@/lib/core/routeAuth';
import { requireMarketingCopyAccess } from '@/lib/marketing/marketingCopyAccess.server';
import { loadMarketingCopy } from '@/lib/marketing/marketingCopy.server';

export const dynamic = 'force-dynamic';
const privateHeaders = { 'Cache-Control': 'private, no-store' };

export async function GET(request: NextRequest) {
  const access = await requireMarketingCopyAccess(request);
  if (isAuthResponse(access)) return access;
  try {
    return NextResponse.json(loadMarketingCopy(), { headers: privateHeaders });
  } catch {
    return NextResponse.json({ error: 'Marketing content could not be loaded.' }, { status: 500, headers: privateHeaders });
  }
}

export async function POST(request: NextRequest) {
  const access = await requireMarketingCopyAccess(request);
  if (isAuthResponse(access)) return access;
  return NextResponse.json({
    code: 'MARKETING_PUBLISH_UNAVAILABLE',
    message: 'Download a draft from Marketing Content and publish it through a reviewed content change.',
  }, { status: 409, headers: privateHeaders });
}
