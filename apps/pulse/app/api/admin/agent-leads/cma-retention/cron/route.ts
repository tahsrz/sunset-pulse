import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 30;

function validCount(count: unknown): count is number {
  return typeof count === 'number' && Number.isInteger(count) && count >= 0;
}

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: 'Unauthorized.' }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
  }

  const [cma, guided, buyer] = await Promise.all([
    supabaseAdmin.from('seller_cma_private_details').delete({ count: 'exact' }).lte('expires_at', new Date().toISOString()),
    supabaseAdmin.rpc('purge_expired_guided_seller_intake'),
    supabaseAdmin.rpc('purge_expired_guided_buyer_requests'),
  ]);

  const guidedFailed = Boolean(guided.error) || !validCount(guided.data);
  const buyerFailed = Boolean(buyer.error) || !validCount(buyer.data);
  if (guidedFailed) {
    console.error('[GUIDED_SELLER_RETENTION_CRON]', guided.error?.code || 'invalid_count');
  }
  if (buyerFailed) {
    console.error('[GUIDED_BUYER_RETENTION_CRON]', buyer.error?.code || 'invalid_count');
  }
  if (cma.error) {
    console.error('[SELLER_CMA_RETENTION_CRON]', cma.error.code || 'delete_failed');
    return NextResponse.json({ ok: false, error: 'Expired private CMA details could not be deleted.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
  if (guidedFailed) {
    return NextResponse.json({ ok: false, error: 'Expired guided seller answers could not be cleared.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
  if (buyerFailed) {
    return NextResponse.json({ ok: false, error: 'Expired buyer requests could not be cleared.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
  return NextResponse.json({ ok: true, deletedCount: cma.count || 0, prunedJourneyCount: guided.data, prunedBuyerRequestCount: buyer.data }, { headers: { 'Cache-Control': 'no-store' } });
}
