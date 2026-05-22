import { getAtlasPulseSummary } from '@/lib/tah/texasPlaceHistory';

export const dynamic = 'force-dynamic';

export function GET() {
  return Response.json(
    {
      generatedAt: new Date().toISOString(),
      atlasPulse: getAtlasPulseSummary()
    },
    {
      headers: {
        'Cache-Control': 'no-store, max-age=0'
      }
    }
  );
}
