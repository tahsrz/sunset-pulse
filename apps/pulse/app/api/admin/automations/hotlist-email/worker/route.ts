import { NextRequest, NextResponse } from 'next/server';
import { processQueuedWorkflowJobs } from '@/lib/autonomous-workflows/durableScheduler.server';
import { reconcileScanUploadReservations } from '@/lib/scans/scanUpload.server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return NextResponse.json({ ok: false, error: 'Licensed workflow worker is not configured.' }, { status: 503 });
  if (request.headers.get('authorization') !== `Bearer ${cronSecret}`) return NextResponse.json({ ok: false, error: 'Unauthorized.' }, { status: 401 });
  try {
    const uploadCleanup = await reconcileScanUploadReservations(50);
    return NextResponse.json({ ok: true, uploadCleanup, ...(await processQueuedWorkflowJobs()) });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Unable to process workflow jobs.' }, { status: 500 });
  }
}
