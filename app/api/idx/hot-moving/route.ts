import { NextRequest } from 'next/server';
import connectDB from '@/lib/core/database';
import Property from '@/models/Property';
import { successResponse, errorResponse } from '@/lib/core/apiResponse';
import { pulseSyncWorker } from '@/lib/data/pulse_sync_worker';

export const dynamic = 'force-dynamic';

/**
 * GET /api/idx/hot-moving
 * Returns a "Hot Moving Special" list of MLS homes.
 * Serves from local cache if possible, otherwise triggers a sync.
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
    .limit(4);

    // 2. If Cache is empty, trigger a background sync and wait for it (Hybrid Edge Case)
    if (listings.length === 0) {
      console.log('📡 [HOT_MOVING] Cache empty. Triggering emergency Matrix sync...');
      const syncResult = await pulseSyncWorker.syncHotListings(10);
      
      if (syncResult.success) {
        // Fetch again after sync
        listings = await Property.find({ 
          source: 'MLS', 
          listing_status: 'Active' 
        })
        .sort({ updatedAt: -1 })
        .limit(4);
      }
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
 * Manual trigger for force sync.
 */
export async function POST() {
  const result = await pulseSyncWorker.syncHotListings(10);
  return successResponse(result);
}
