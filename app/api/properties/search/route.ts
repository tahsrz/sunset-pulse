import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/core/database';
import Property from '@/models/Property';
import { successResponse, errorResponse } from '@/lib/core/apiResponse';
import { buildPropertyQuery } from '@/lib/core/propertyQueryBuilder';
import { PulseCache } from '@/utils/security/PulseCache';

export const dynamic = 'force-dynamic';

// GET /api/properties/search
export const GET = async (request: NextRequest) => {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const params = Object.fromEntries(searchParams.entries());
    
    const { query, signature } = buildPropertyQuery(params);

    //  Cache Check
    const cachedData = PulseCache.get(signature);
    if (cachedData) {
      const response = successResponse(cachedData, { signature, cached: true });
      response.headers.set('X-Cache', 'HIT');
      return response;
    }

    //  Database Execution
    const properties = await Property.find(query);

    //  Store in PulseCache
    PulseCache.set(signature, properties);

    const response = successResponse(properties, { signature, cached: false });
    response.headers.set('X-Cache', 'MISS');
    return response;
  } catch (error: any) {
    return errorResponse('Grid search failed.', 500, error.message);
  }
};
