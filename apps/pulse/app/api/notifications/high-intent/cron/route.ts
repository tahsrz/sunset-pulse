import { NextRequest, NextResponse } from 'next/server';
import { runAgentAlertNotificationWorker } from '@/lib/intelligence/agentAlertNotifications';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ ok: false, error: 'Notification worker is not configured.' }, { status: 503 });
  }
  if (request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ ok: false, error: 'Unauthorized.' }, { status: 401 });
  }

  try {
    const result = await runAgentAlertNotificationWorker(20);
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    console.error('[AGENT_ALERT_NOTIFICATION_CRON]', error instanceof Error ? error.message : 'Unknown worker failure.');
    return NextResponse.json({ ok: false, error: 'Notification worker failed.' }, { status: 500 });
  }
}
