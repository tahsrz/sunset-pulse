import { NextRequest } from 'next/server';
import Property from '@/models/Property';
import { successResponse, errorResponse } from '@/lib/core/apiResponse';
import { pulseSyncWorker } from '@/lib/data/pulse_sync_worker';
import { hasUsableRemoteListingImage } from '@/lib/data/listingContract';
import { isAuthResponse, requireOperatorRouteAccess } from '@/lib/core/routeAuth';
import connectDB from '@/lib/core/database';

export const dynamic = 'force-dynamic';

/** Returns image-qualified, publicly displayable MLS listings for the homepage. */
export async function GET(_request: NextRequest) {
  try {
    await connectDB();
    const candidates = await Property.find({
      source: 'MLS',
      listing_status: 'Active',
      is_demo: { $ne: true },
      display_public: { $ne: false },
    })
      .sort({ updatedAt: -1 })
      .limit(80)
      .lean();

    const listings = candidates
      .filter((listing) => listing.source === 'MLS' && listing.display_public !== false)
      .slice(0, 8)
      .map((listing) => hasUsableRemoteListingImage(listing)
        ? listing
        : { ...listing, images: [fallbackImageFor(String(listing.mls_id || listing._id || 'listing'))] });
    return successResponse({
      listings,
      count: listings.length,
      sector: 'North Texas // Public MLS Cache',
      syncedAt: listings.length > 0 ? listings[0].updatedAt : null,
    });
  } catch (error: any) {
    console.error('[HOT_MOVING_ERROR]: Signal lost.', error);
    return errorResponse('Failed to fetch hot moving listings.', 500, error.message);
  }
}

const MLS_IMAGE_FALLBACKS = [
  '/images/properties/land1.jpg',
  '/images/properties/barndo1.jpg',
  '/images/properties/rhome1.jpg',
  '/images/properties/ranch1.jpg',
  '/images/properties/244ridge1.jpg',
];

function fallbackImageFor(stableKey: string) {
  const hash = Array.from(stableKey).reduce((sum, character) => sum + character.charCodeAt(0), 0);
  return MLS_IMAGE_FALLBACKS[hash % MLS_IMAGE_FALLBACKS.length];
}

/** Operator-only manual refresh. Public homepage reads never trigger ingestion. */
export async function POST(request: NextRequest) {
  const access = await requireOperatorRouteAccess(request);
  if (isAuthResponse(access)) return access;

  const [hot, historical] = await Promise.all([
    pulseSyncWorker.syncHotListings(10),
    pulseSyncWorker.syncHistoricalSales(10),
  ]);
  return successResponse({ hot, historical });
}
