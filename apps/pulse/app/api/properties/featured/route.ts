import { NextRequest } from 'next/server';
import { getProperties } from '@/lib/core/propertyRecon';
import { successResponse, errorResponse } from '@/lib/core/apiResponse';

export const dynamic = 'force-dynamic';

// GET /api/properties/featured
export const GET = async (request: NextRequest) => {
  try {
    const properties = await getProperties({ showFeatured: true });
    return successResponse(properties);
  } catch (error: any) {
    return errorResponse('Intelligence failure in featured property reconnaissance.', 500, error.message);
  }
};
