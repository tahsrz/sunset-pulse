export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { successResponse } from '@/lib/core/apiResponse';
import { searchHistoricalPublicListings } from '@/lib/data/publicInventory';
import { LOCATION_GUESS_DECK, normalizePropertyForLocationGuess } from '@/lib/location-guess/game';

const DEFAULT_LIMIT = 60;
const MAX_SCAN_LIMIT = 200;

export async function GET(request: NextRequest) {
  const limit = clampLimit(request.nextUrl.searchParams.get('limit'));

  try {
    const publicListings = await searchHistoricalPublicListings(MAX_SCAN_LIMIT);
    const listings = publicListings
      .map((property) => normalizePropertyForLocationGuess(property))
      .filter(Boolean)
      .slice(0, limit);

    return successResponse({
      listings: listings.length ? listings : LOCATION_GUESS_DECK,
      source: listings.length ? 'property-grid' : 'curated-fallback',
      fallback: listings.length === 0
    });
  } catch (error: any) {
    console.warn('[LOCATION_GUESS_FEED_FALLBACK]', error?.message || error);
    return successResponse({
      listings: LOCATION_GUESS_DECK,
      source: 'curated-fallback',
      fallback: true
    });
  }
}

function clampLimit(value: string | null) {
  const parsed = Number(value || DEFAULT_LIMIT);
  if (!Number.isFinite(parsed)) return DEFAULT_LIMIT;
  return Math.min(Math.max(Math.trunc(parsed), 1), DEFAULT_LIMIT);
}
