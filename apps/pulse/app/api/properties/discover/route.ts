import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import {
  discoverListings,
  parseListingDiscoverySearchParams,
} from '@/lib/data/listingDiscovery';
import { PulseCache } from '@/utils/security/PulseCache';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    const searchParams = new URL(request.url).searchParams;
    const input = parseListingDiscoverySearchParams(searchParams);
    const signature = `listing-discovery:${JSON.stringify(input)}`;
    const cached = PulseCache.get(signature);

    if (cached) return discoveryResponse(cached, true);

    const result = await discoverListings(input);
    PulseCache.set(signature, result, 60_000);
    return discoveryResponse(result, false);
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({
        error: true,
        message: 'Invalid listing discovery filters.',
        issues: error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message })),
      }, { status: 400 });
    }

    console.error('[LISTING_DISCOVERY_API]', error);
    return NextResponse.json({ error: true, message: 'Listing discovery is temporarily unavailable.' }, { status: 500 });
  }
}

function discoveryResponse(result: Awaited<ReturnType<typeof discoverListings>>, cached: boolean) {
  return NextResponse.json({
    success: true,
    data: result.listings,
    pagination: result.pagination,
    criteria: result.criteria,
    generatedAt: result.generatedAt,
    metadata: { cached },
  }, {
    headers: {
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      'X-Cache': cached ? 'HIT' : 'MISS',
    },
  });
}
