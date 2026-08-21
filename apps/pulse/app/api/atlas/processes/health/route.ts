import { NextRequest, NextResponse } from 'next/server';
import { readWikipediaHeartbeat } from '@/lib/core/wikipedia_heartbeat';
import { dispatchOperationalAlert } from '@/lib/notifications/agentAlertChannels';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: 'Unauthorized.' }, { status: 401 });
  }
  const heartbeat = await readWikipediaHeartbeat();
  const ageMs = heartbeat ? Date.now() - Date.parse(heartbeat.updatedAt) : Number.POSITIVE_INFINITY;
  const state = heartbeat?.payload?.state as Record<string, unknown> | undefined;
  const health = state?.health as Record<string, unknown> | undefined;
  const status = String(health?.status || heartbeat?.status || 'missing');
  const retryDrainRate = health?.retryDrainRate == null ? null : Number(health.retryDrainRate);
  const unhealthy = ageMs > 15 * 60_000 || ['paused', 'dependency_error'].includes(status) || retryDrainRate === 0;
  if (!unhealthy) return NextResponse.json({ ok: true, status, alerted: false });

  const window = Math.floor(Date.now() / (15 * 60_000));
  const outcome = await dispatchOperationalAlert({
    subject: `Wikipedia crawler requires attention: ${status}`,
    idempotencyKey: `crawler-health-${heartbeat?.crawlerId || 'wikipedia-en'}-${status}-${window}`,
    text: [
      `Crawler: ${heartbeat?.crawlerId || 'wikipedia-en'}`,
      `Status: ${status}`,
      `Heartbeat age: ${Number.isFinite(ageMs) ? Math.round(ageMs / 60_000) : 'missing'} minutes`,
      `Retry recovery: ${retryDrainRate == null ? 'not measured' : `${retryDrainRate}%`}`,
      `Backlog: ${String(health?.retryBacklog ?? 'unknown')}`,
      `Last error: ${String(health?.lastError || 'none')}`,
      '',
      'Open Atlas: https://sunsetpulse.app/atlas',
    ].join('\n'),
  });
  return NextResponse.json({ ok: outcome.status !== 'failed', status, alerted: outcome.status === 'sent', outcome });
}
