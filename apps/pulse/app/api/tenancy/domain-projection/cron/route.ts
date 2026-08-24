import { NextRequest, NextResponse } from 'next/server';
import { runDomainManifestWorker } from '@/lib/tenancy/domainManifestWorker';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: 'Unauthorized.' }, { status: 401 });
  }
  try {
    return NextResponse.json({ ok: true, result: await runDomainManifestWorker(10) });
  } catch (error) {
    console.error('[DOMAIN_MANIFEST_PROJECTION_CRON]', error instanceof Error ? error.message : 'Unknown failure.');
    return NextResponse.json({ ok: false, error: 'Domain projection worker failed.' }, { status: 500 });
  }
}
