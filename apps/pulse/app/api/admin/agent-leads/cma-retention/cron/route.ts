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

  const { count, error } = await supabaseAdmin
    .from('seller_cma_private_details')
    .delete({ count: 'exact' })
    .lt('expires_at', new Date().toISOString());

  if (error) {
    console.error('[SELLER_CMA_RETENTION_CRON]', error.code || 'delete_failed');
    return NextResponse.json({ ok: false, error: 'Expired private CMA details could not be deleted.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
  return NextResponse.json({ ok: true, deletedCount: count || 0 }, { headers: { 'Cache-Control': 'no-store' } });
}
