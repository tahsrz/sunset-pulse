import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { successResponse, errorResponse } from '@/lib/core/apiResponse';
import { applyPropertyFilters } from '@/lib/core/supabaseQueryBuilder';
import { PulseCache } from '@/utils/security/PulseCache';
import { PulseHash } from '@/utils/security/PulseHash';

export const dynamic = 'force-dynamic';

// GET /api/properties/search
export const GET = async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    const params = Object.fromEntries(searchParams.entries());
    
    // Generate signature for caching
    const signature = PulseHash.signature(params);

    // 1. Cache Check
    const cachedData = PulseCache.get(signature);
    if (cachedData) {
      const response = successResponse(cachedData, { signature, cached: true });
      response.headers.set('X-Cache', 'HIT');
      return response;
    }

    // 2. Supabase Execution (Alpha Consolidation)
    let query = supabase.from('properties').select('*');
    query = applyPropertyFilters(query, params);

    const { data: properties, error } = await query;

    if (error) {
      throw error;
    }

    // 3. Store in PulseCache
    PulseCache.set(signature, properties);

    const response = successResponse(properties, { signature, cached: false });
    response.headers.set('X-Cache', 'MISS');
    return response;
  } catch (error: any) {
    console.error('[API_SEARCH_ERROR]', error.message);
    return errorResponse('Grid search failed.', 500, error.message);
  }
};
