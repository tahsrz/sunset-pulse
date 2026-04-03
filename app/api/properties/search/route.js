import connectDB from '@/lib/core/database';
import Property from '@/models/Property';
import { successResponse, errorResponse } from '@/lib/core/apiResponse';
import { buildPropertyQuery } from '@/lib/core/propertyQueryBuilder';

// GET /api/properties/search
export const GET = async (request) => {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const params = Object.fromEntries(searchParams.entries());
    
    const query = buildPropertyQuery(params);
    const properties = await Property.find(query);

    return successResponse(properties);
  } catch (error) {
    return errorResponse('Intelligence Grid search failed.', 500, error.message);
  }
};
