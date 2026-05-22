import { NextRequest } from 'next/server';
import { getGroundTruth } from '@/lib/core/surgicalRetriever';
import { successResponse, errorResponse } from '@/lib/core/apiResponse';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query');

    if (!query) {
      return errorResponse('Query parameter is required.', 400);
    }

    const results = await getGroundTruth(query);
    return successResponse(results);
  } catch (error: any) {
    console.error('[GROUND_TRUTH_API_ERROR]', error);
    return errorResponse('Failed to retrieve ground truth intelligence.', 500, error.message);
  }
}
