import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/core/apiResponse';
import { getTourHotList } from '@/lib/data/tourHotList';

export const dynamic = 'force-dynamic';

// GET /api/properties/hot-list
export const GET = async (request: NextRequest) => {
  try {
    const limit = Number(request.nextUrl.searchParams.get('limit') || 10);
    const result = await getTourHotList({ limit });
    return successResponse(result.listings, {
      configuredTargets: result.targets,
      unresolved: result.unresolved,
      skipped: result.skipped,
      generatedAt: result.generatedAt,
    });
  } catch (error: any) {
    return errorResponse('Failed to resolve the Tour Studio hot list.', 500, error.message);
  }
};
