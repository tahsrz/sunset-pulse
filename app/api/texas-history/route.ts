import { listTexasPlaceHistory, TEXAS_PLACE_HISTORY_CARTRIDGE, TEXAS_PLACE_HISTORY_ROLLOUT } from '@/lib/tah/texasPlaceHistory';

export const dynamic = 'force-dynamic';

export function GET() {
  const places = listTexasPlaceHistory();

  return Response.json(
    {
      generatedAt: new Date().toISOString(),
      cartridge: TEXAS_PLACE_HISTORY_CARTRIDGE,
      count: places.length,
      places: places.map(place => ({
        slug: place.slug,
        name: place.name,
        region: place.region,
        headline: place.headline,
        summary: place.summary,
        tah: place.tah,
        atlasPulse: place.atlasPulse,
        url: `/api/texas-history/${place.slug}`
      })),
      rollout: TEXAS_PLACE_HISTORY_ROLLOUT
    },
    {
      headers: {
        'Cache-Control': 'no-store, max-age=0'
      }
    }
  );
}
