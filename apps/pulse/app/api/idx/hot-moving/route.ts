import { NextRequest } from 'next/server';
import Property from '@/models/Property';
import { successResponse, errorResponse } from '@/lib/core/apiResponse';
import { pulseSyncWorker } from '@/lib/data/pulse_sync_worker';
import { getUsableRemoteListingImages } from '@/lib/data/listingContract';
import { isAuthResponse, requireOperatorRouteAccess } from '@/lib/core/routeAuth';
import connectDB from '@/lib/core/database';

export const dynamic = 'force-dynamic';

type HotMovingCandidate = {
  source?: string;
  display_public?: boolean;
  mls_id?: unknown;
  _id?: unknown;
  images?: unknown;
  image_url?: unknown;
  updatedAt?: Date | string | null;
  [key: string]: unknown;
};

/** Returns public MLS listings with real photos or an explicit missing-photo placeholder. */
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
      .lean() as HotMovingCandidate[];

    const listings = candidates
      .filter((listing) => listing.source === 'MLS' && listing.display_public !== false)
      .slice(0, 8)
      .map((listing) => {
        const images = getUsableRemoteListingImages(listing);
        return { ...listing, images: images.length ? images : ['/images/property-placeholder.svg'] };
      });
    const syncedAt = listings[0]?.updatedAt;
    return successResponse({
      listings,
      count: listings.length,
      sector: 'North Texas // Public MLS Cache',
      syncedAt: syncedAt instanceof Date ? syncedAt.toISOString() : syncedAt || null,
    });
  } catch (error: any) {
    console.error('[HOT_MOVING_ERROR]: Signal lost.', error);
    return errorResponse('Failed to fetch hot moving listings.', 500, error.message);
  }
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
