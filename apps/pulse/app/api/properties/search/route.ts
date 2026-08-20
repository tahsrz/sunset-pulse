import { NextRequest } from 'next/server';
import { successResponse } from '@/lib/core/apiResponse';
import { searchListings } from '@/lib/data/listingRepository';
import { projectPublicListing } from '@/lib/data/publicInventory';
import { PulseCache } from '@/utils/security/PulseCache';

export const dynamic = 'force-dynamic';

// GET /api/properties/search
// Consolidates internal grid search with geospatial support
export const GET = async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    const params = Object.fromEntries(searchParams.entries());

    const signature = JSON.stringify(Object.entries(params).sort(([a], [b]) => a.localeCompare(b)));

    // 2. Cache Check
    const cachedData = PulseCache.get(signature);
    if (cachedData) {
      const response = successResponse(cachedData, { signature, cached: true });
      response.headers.set('X-Cache', 'HIT');
      return response;
    }

    const listings = await searchListings({
      location: params.location || params.city,
      city: params.city,
      propertyType: params.propertyType,
      priceType: params.priceType as 'sale' | 'lease' | 'unknown' | undefined,
      minPrice: params.minPrice,
      maxPrice: params.maxPrice,
      beds: params.beds,
      baths: params.baths,
      status: params.status,
      source: params.source as 'Internal' | 'MLS' | undefined,
      polygon: params.polygon,
      radius: params.radius,
      center: params.center,
      includeDemo: false,
    }, { limit: 500, publicOnly: true });
    const properties = listings.map(projectPublicListing);

    // 4. Store in PulseCache
    PulseCache.set(signature, properties);

    const response = successResponse(properties, { signature, cached: false, source: 'canonical-repository' });
    response.headers.set('X-Cache', 'MISS');
    return response;
  } catch (error: any) {
    console.error('[API_SEARCH_ERROR]', error.message);
    return successResponse([], {
      cached: false,
      source: 'unavailable',
      warning: 'Property search is temporarily unavailable. No listings were returned.',
    });
  }
};
