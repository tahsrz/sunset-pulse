import { NextRequest, NextResponse } from 'next/server';
import { captureProfitBaselineCheckpoint } from '@/lib/profit/profitFunnelAnalytics';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: 'Unauthorized.' }, { status: 401 });
  }
  try {
    return NextResponse.json({ ok: true, result: await captureProfitBaselineCheckpoint() });
  } catch (error) {
    console.error('[PROFIT_BASELINE_CRON]', error instanceof Error ? error.message : 'Unknown failure.');
    return NextResponse.json({ ok: false, error: 'Profit baseline checkpoint failed.' }, { status: 500 });
  }
}
