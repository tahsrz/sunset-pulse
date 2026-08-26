export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/core/apiResponse';
import { PulseCache } from '@/utils/security/PulseCache';
import { searchListings } from '@/lib/data/listingRepository';

/**
 * GET /api/properties/search/advanced
 * Full  intelligence search across internal grid and external MLS.
 */
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

    const allResults = await searchListings({
      location: params.location,
      propertyType: params.propertyType,
      minPrice: params.minPrice,
      maxPrice: params.maxPrice,
      beds: params.beds,
      baths: params.baths,
      polygon: params.polygon,
      radius: params.radius,
      center: params.center,
      includeDemo: params.includeDemo === 'true',
    }, { limit: 500 });

    // 3. Store in PulseCache
    PulseCache.set(signature, allResults);

    const response = successResponse(allResults, { signature, cached: false });
    response.headers.set('X-Cache', 'MISS');
    return response;

  } catch (error: any) {
    return errorResponse('Advanced intelligence search failed.', 500, error.message);
  }
};
