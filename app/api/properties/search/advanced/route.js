import connectDB from '@/lib/core/database';
import Property from '@/models/Property';
import { mlsService } from '@/lib/data/mls';
import { successResponse, errorResponse } from '@/lib/core/apiResponse';
import { buildPropertyQuery } from '@/lib/core/propertyQueryBuilder';

/**
 * GET /api/properties/search/advanced
 * Full  intelligence search across internal grid and external MLS.
 */
export const GET = async (request) => {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const params = Object.fromEntries(searchParams.entries());
    const includeMLS = params.includeMLS !== 'false';

    // Build and Execute Internal Grid Query
    const query = buildPropertyQuery(params);
    const internalProperties = await Property.find(query).lean();

    // External MLS Intelligence via Repliers.io bridge
    let mlsProperties = [];
    if (includeMLS) {
      const mlsParams = {
        city: params.location,
        type: params.propertyType === 'All' ? '' : params.propertyType,
        minPrice: params.minPrice,
        maxPrice: params.maxPrice,
        beds: params.minBeds,
        bathrooms: params.minBaths
      };
      
      const mlsData = await mlsService.getListings(mlsParams);
      // Filter for unique external assets
      mlsProperties = mlsData.filter(p => p.source === 'MLS');
    }

    const allResults = [...internalProperties, ...mlsProperties];
    return successResponse(allResults);

  } catch (error) {
    return errorResponse('Advanced intelligence search failed.', 500, error.message);
  }
};
