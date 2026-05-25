export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import connectDB from '@/lib/core/database';
import Property from '@/models/Property';
import { mlsService } from '@/lib/data/mls';
import { successResponse, errorResponse } from '@/lib/core/apiResponse';
import { buildPropertyQuery } from '@/lib/core/propertyQueryBuilder';
import { PulseCache } from '@/utils/security/PulseCache';
import { normalizePropertyPricing } from '@/lib/core/propertyRecon';

/**
 * GET /api/properties/search/advanced
 * Full  intelligence search across internal grid and external MLS.
 */
export const GET = async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    const params = Object.fromEntries(searchParams.entries());
    const includeMLS = params.includeMLS !== 'false';

    // 1. Build Query & Handle Cache Signature
    const { query, signature } = buildPropertyQuery(params);

    // 2. Cache Check
    const cachedData = PulseCache.get(signature);
    if (cachedData) {
      const response = successResponse(cachedData, { signature, cached: true });
      response.headers.set('X-Cache', 'HIT');
      return response;
    }

    await connectDB();

    // Build and Execute Internal Grid Query
    const internalProperties = await Property.find(query).lean();

    // External MLS Intelligence via Repliers.io bridge
    let mlsProperties: any[] = [];
    if (includeMLS) {
      const mlsParams = {
        city: params.location,
        type: params.propertyType === 'All' ? '' : params.propertyType,
        minPrice: params.minPrice,
        maxPrice: params.maxPrice,
        beds: params.beds,
        bathrooms: params.baths
      };
      
      const mlsData = await mlsService.getListings(mlsParams);
      // Filter for unique external assets
      mlsProperties = mlsData.filter((p: any) => p.source === 'MLS');
    }

    const allResults = [...internalProperties, ...mlsProperties].map(normalizePropertyPricing);

    // 3. Store in PulseCache
    PulseCache.set(signature, allResults);

    const response = successResponse(allResults, { signature, cached: false });
    response.headers.set('X-Cache', 'MISS');
    return response;

  } catch (error: any) {
    return errorResponse('Advanced intelligence search failed.', 500, error.message);
  }
};