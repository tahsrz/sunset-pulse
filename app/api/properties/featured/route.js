import { getProperties } from '@/lib/core/propertyRecon';
import { successResponse, errorResponse } from '@/lib/core/apiResponse';

// GET /api/properties/featured
export const GET = async (request) => {
  try {
    const properties = await getProperties({ showFeatured: true });
    return successResponse(properties);
  } catch (error) {
    return errorResponse('Intelligence failure in featured property reconnaissance.', 500, error.message);
  }
};
