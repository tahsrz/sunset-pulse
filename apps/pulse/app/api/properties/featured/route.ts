import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/core/apiResponse';
import { getTourHotList } from '@/lib/data/tourHotList';

export const dynamic = 'force-dynamic';

// GET /api/properties/featured
export const GET = async (request: NextRequest) => {
  try {
    const limit = Number(request.nextUrl.searchParams.get('limit') || 10);
    const result = await getTourHotList({ limit });
    return successResponse(result.listings, {
      source: result.targets.length > 0 ? 'tour_hot_list' : 'mls_fallback',
      targets: result.targets.length,
      unresolved: result.unresolved,
      skipped: result.skipped,
      generatedAt: result.generatedAt,
    });
  } catch (error: any) {
    return errorResponse('Intelligence failure in featured property reconnaissance.', 500, error.message);
  }
};
