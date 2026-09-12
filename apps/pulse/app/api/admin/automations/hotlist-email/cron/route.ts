import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { runHotlistEmailForUser } from '@/app/api/admin/automations/hotlist-email/route';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return NextResponse.json({ ok: false, error: 'Licensed workflow scheduler is not configured.' }, { status: 503 });
  if (request.headers.get('authorization') !== `Bearer ${cronSecret}`) return NextResponse.json({ ok: false, error: 'Unauthorized.' }, { status: 401 });

  const { data: settings, error } = await supabaseAdmin.from('licensed_workflow_settings')
    .select('user_id').eq('enabled', true).eq('auto_send', true).limit(25);
  if (error) return NextResponse.json({ ok: false, error: 'Unable to load licensed workflow schedules.' }, { status: 500 });

  const results: Array<{ userId: string; status: string; runId?: string; error?: string }> = [];
  for (const row of settings || []) {
    try {
      const result = await runHotlistEmailForUser({ userId: row.user_id, auditName: 'Scheduled licensed workflow', confirmAutoSend: true });
      results.push({ userId: row.user_id, status: result.reused ? 'unchanged' : result.autoSent ? 'sent' : 'drafted', runId: result.run.id });
    } catch (runError) {
      results.push({ userId: row.user_id, status: 'failed', error: runError instanceof Error ? runError.message : 'Unknown workflow failure.' });
    }
  }
  return NextResponse.json({ ok: true, processed: results.length, results });
}
