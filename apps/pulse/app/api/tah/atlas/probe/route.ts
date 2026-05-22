import { NextRequest } from 'next/server';
import { buildAtlasProbe } from '@/lib/ai/brain/atlas_probe';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export function GET(request: NextRequest) {
  const cursor = Number(request.nextUrl.searchParams.get('cursor') || 0);
  const limit = Number(request.nextUrl.searchParams.get('limit') || 12);

  return Response.json(buildAtlasProbe(cursor, limit), {
    headers: {
      'Cache-Control': 'no-store, max-age=0'
    }
  });
}
