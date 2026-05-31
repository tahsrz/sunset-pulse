import { NextRequest, NextResponse } from 'next/server';
import { getLatestNewsSignal, insertNewsSignal, normalizeNewsSignal } from '@/lib/news/signalStore';

export const dynamic = 'force-dynamic';

const getSignalSecret = () => process.env.NEWS_SIGNAL_SECRET || process.env.LOCAL_NEWS_SIGNAL_SECRET;

const isAuthorized = (request: NextRequest) => {
  const secret = getSignalSecret();
  if (!secret) return false;

  const header = request.headers.get('authorization') || '';
  return header === `Bearer ${secret}`;
};

export async function GET() {
  const signal = await getLatestNewsSignal();

  if (!signal) {
    return NextResponse.json({ signal: null, error: 'No local news signal has been synced yet.' }, { status: 404 });
  }

  return NextResponse.json({
    signal,
    timestamp: new Date().toISOString(),
  });
}

export async function POST(request: NextRequest) {
  if (!getSignalSecret()) {
    return NextResponse.json({ error: 'NEWS_SIGNAL_SECRET is not configured.' }, { status: 503 });
  }

  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized news signal publisher.' }, { status: 401 });
  }

  try {
    const signal = normalizeNewsSignal(await request.json());
    if (!signal) {
      return NextResponse.json({ error: 'Payload must include at least one valid news article.' }, { status: 400 });
    }

    const row = await insertNewsSignal(signal);

    return NextResponse.json({
      ok: true,
      id: row?.id,
      createdAt: row?.created_at,
      acceptedArticles: signal.articles.length,
      provider: signal.provider,
      mini: signal.mini,
    });
  } catch (error: any) {
    console.error('[PULSE_NEWS_SIGNAL_INGEST_ERROR]', error);
    return NextResponse.json({ error: 'Failed to ingest local news signal.' }, { status: 500 });
  }
}
