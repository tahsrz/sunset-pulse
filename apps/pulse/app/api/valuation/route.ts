export const dynamic = 'force-dynamic';
import type { NextRequest } from 'next/server';
import connectDB from '@/lib/core/database';
import Valuation from '@/models/Valuation';
import { successResponse, errorResponse } from '@/lib/core/apiResponse';

// GET /api/valuation - Fetch confirmed valuations for the map
export const GET = async () => {
  try {
    if (process.env.NEXT_PUBLIC_MOCK_MODE === 'true') return successResponse([]);
    await connectDB();
    const valuations = await Valuation.find({ status: 'Confirmed', publiclyShareable: true })
      .select('_id address estimate location_geo createdAt')
      .lean();
    return successResponse(valuations);
  } catch (error: any) {
    return errorResponse('Failed to fetch valuation.', 500);
  }
};

// POST /api/valuation - Create a draft valuation
export const POST = async (_request: NextRequest) => {
  return Response.json({
    success: false,
    code: 'VALUATION_UNAVAILABLE',
    message: 'Automated valuation is unavailable until a licensed data source and human-reviewed CMA workflow are configured.',
  }, { status: 503 });
};
