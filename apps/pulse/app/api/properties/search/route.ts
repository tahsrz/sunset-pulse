import { NextRequest } from 'next/server';
import connectDB from '@/lib/core/database';
import Property from '@/models/Property';
import { successResponse, errorResponse } from '@/lib/core/apiResponse';
import { buildPropertyQuery } from '@/lib/core/propertyQueryBuilder';
import { PulseCache } from '@/utils/security/PulseCache';

export const dynamic = 'force-dynamic';

// GET /api/properties/search
// Consolidates internal grid search with geospatial support
export const GET = async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    const params = Object.fromEntries(searchParams.entries());
    
    // 1. Build Query & Handle Cache Signature
    const { query, signature } = buildPropertyQuery(params);

    // 2. Cache Check
    const cachedData = PulseCache.get(signature);
    if (cachedData) {
      const response = successResponse(cachedData, { signature, cached: true });
      response.headers.set('X-Cache', 'HIT');
      return response;
    }

    // 3. Database Execution (MongoDB Source of Truth for Explorer)
    await connectDB();
    const properties = await Property.find(query).lean();

    // 4. Store in PulseCache
    PulseCache.set(signature, properties);

    const response = successResponse(properties, { signature, cached: false });
    response.headers.set('X-Cache', 'MISS');
    return response;
  } catch (error: any) {
    console.error('[API_SEARCH_ERROR]', error.message);
    return errorResponse('Grid search failed.', 500, error.message);
  }
};
