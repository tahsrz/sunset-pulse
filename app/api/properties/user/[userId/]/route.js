import connectDB from '@/lib/core/database';
import Property from '@/models/Property';
import { successResponse, errorResponse } from '@/lib/core/apiResponse';

// GET /api/properties/user/:userId
export const GET = async (request, { params }) => {
  try {
    await connectDB();

    const userId = params.userId;

    if (!userId) {
      return errorResponse('User ID is required for property reconnaissance.', 400);
    }

    const properties = await Property.find({ owner: userId });

    return successResponse(properties);
  } catch (error) {
    console.error('[USER_PROPERTIES_FETCH_ERROR]:', error);
    return errorResponse('Failed to retrieve user property assets.', 500, error.message);
  }
};
