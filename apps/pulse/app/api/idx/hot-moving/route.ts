import { NextRequest } from 'next/server';
import connectDB from '@/lib/core/database';
import Property from '@/models/Property';
import { successResponse, errorResponse } from '@/lib/core/apiResponse';
import { pulseSyncWorker } from '@/lib/data/pulse_sync_worker';

export const dynamic = 'force-dynamic';

/**
 * GET /api/idx/hot-moving
 * Returns a "Hot Moving Special" list of MLS homes
 * Serves from local cache if possible, otherwise triggers a sync
 */
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    // 1. Query the Local Grid Cache for recent MLS listings
    let listings = await Property.find({ 
      source: 'MLS', 
      listing_status: 'Active' 
    })
    .sort({ updatedAt: -1 })
    .limit(8);

    // If Cache is sparse, trigger a background sync
    if (listings.length < 4) {
      console.log('📡 [HOT_MOVING] Cache sparse. Triggering emergency Matrix sync...');
      // Sync active listings and historical sales simultaneously
      await Promise.all([
        pulseSyncWorker.syncHotListings(12),
        pulseSyncWorker.syncHistoricalSales(12)
      ]);
      
      // Fetch again after sync attempt
      listings = await Property.find({ 
        source: 'MLS', 
        listing_status: 'Active' 
      })
      .sort({ updatedAt: -1 })
      .limit(8);
    }

    // Fallback
    if (listings.length < 4) {
      const internalListings = await Property.find({
        source: 'Internal',
        listing_status: 'Active',
        is_featured: { $ne: true } // Don't duplicate what's likely in the "Staged" tab
      })
      .sort({ createdAt: -1 })
      .limit(8 - listings.length);
      
      listings = [...listings, ...internalListings];
    }

    return successResponse({
      listings,
      count: listings.length,
      sector: 'North Texas // Local Grid Cache',
      syncedAt: listings.length > 0 ? listings[0].updatedAt : null
    });
  } catch (error: any) {
    console.error('[HOT_MOVING_ERROR]: Signal lost.', error);
    return errorResponse('Failed to fetch hot moving listings.', 500, error.message);
  }
}

/**
 * POST /api/idx/hot-moving
 * Manual trigger for force sync
 */
export async function POST() {
  const [hot, historical] = await Promise.all([
    pulseSyncWorker.syncHotListings(10),
    pulseSyncWorker.syncHistoricalSales(10)
  ]);
  return successResponse({ hot, historical });
}
