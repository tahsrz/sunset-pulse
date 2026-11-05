import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 30;

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: 'Unauthorized.' }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
  }

  const [cma, guided] = await Promise.all([
    supabaseAdmin.from('seller_cma_private_details').delete({ count: 'exact' }).lte('expires_at', new Date().toISOString()),
    supabaseAdmin.rpc('purge_expired_guided_seller_intake'),
  ]);

  const invalidGuidedCount = typeof guided.data !== 'number' || !Number.isInteger(guided.data) || guided.data < 0;
  if (guided.error || invalidGuidedCount) {
    console.error('[GUIDED_SELLER_RETENTION_CRON]', guided.error?.code || 'invalid_count');
  }
  if (cma.error) {
    console.error('[SELLER_CMA_RETENTION_CRON]', cma.error.code || 'delete_failed');
    return NextResponse.json({ ok: false, error: 'Expired private CMA details could not be deleted.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
  if (guided.error || invalidGuidedCount) {
    return NextResponse.json({ ok: false, error: 'Expired guided seller answers could not be cleared.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
  return NextResponse.json({ ok: true, deletedCount: cma.count || 0, prunedJourneyCount: guided.data }, { headers: { 'Cache-Control': 'no-store' } });
}
