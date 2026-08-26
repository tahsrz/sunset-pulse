export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import connectDB from '@/lib/core/database';
import Property from '@/models/Property';
import { successResponse } from '@/lib/core/apiResponse';
import { sanitizeMlsForPublicUse } from '@/lib/data/mlsCompliance';
import { LOCATION_GUESS_DECK, normalizePropertyForLocationGuess } from '@/lib/location-guess/game';

const DEFAULT_LIMIT = 60;
const MAX_SCAN_LIMIT = 200;

export async function GET(request: NextRequest) {
  const limit = clampLimit(request.nextUrl.searchParams.get('limit'));

  try {
    await connectDB();
    const rawProperties = await Property.find({
      is_demo: { $ne: true },
      listing_status: { $in: ['Sold', 'Closed', 'S'] },
      'location_geo.coordinates': { $exists: true, $type: 'array', $size: 2 },
      images: { $exists: true, $ne: [] }
    })
      .sort({ updatedAt: -1, createdAt: -1 })
      .limit(MAX_SCAN_LIMIT)
      .lean();

    const listings = rawProperties
      .map((property: any) => normalizePropertyForLocationGuess(sanitizeMlsForPublicUse(property)))
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
