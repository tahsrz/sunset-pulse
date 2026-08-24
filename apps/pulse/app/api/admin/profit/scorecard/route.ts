import { NextRequest, NextResponse } from 'next/server';
import { isAuthResponse, requireOperatorRouteAccess } from '@/lib/core/routeAuth';
import { loadProfitFunnelAnalytics } from '@/lib/profit/profitFunnelAnalytics';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const access = await requireOperatorRouteAccess(request);
  if (isAuthResponse(access)) return access;
  if (access.user?.role === 'realtor') {
    return NextResponse.json({ ok: false, error: 'Organization profit analytics require admin or operator access.' }, { status: 403 });
  }

  try {
    return NextResponse.json({ ok: true, scorecard: await loadProfitFunnelAnalytics() });
  } catch (error) {
    console.error('[PROFIT_SCORECARD]', error);
    return NextResponse.json({ ok: false, error: 'Profit scorecard is temporarily unavailable.' }, { status: 503 });
  }
}
