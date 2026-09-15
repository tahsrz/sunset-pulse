import { NextRequest, NextResponse } from 'next/server';
import { enqueueDueWorkflowJobs } from '@/lib/autonomous-workflows/durableScheduler.server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return NextResponse.json({ ok: false, error: 'Licensed workflow scheduler is not configured.' }, { status: 503 });
  if (request.headers.get('authorization') !== `Bearer ${cronSecret}`) return NextResponse.json({ ok: false, error: 'Unauthorized.' }, { status: 401 });

  try {
    const result = await enqueueDueWorkflowJobs();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Unable to enqueue workflow jobs.' }, { status: 500 });
  }
}
