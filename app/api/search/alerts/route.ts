import { NextRequest } from 'next/server';
import connectDB from '@/lib/core/database';
import User from '@/models/User';
import { getSessionUser } from '@/lib/core/getSessionUser';
import { successResponse, errorResponse, unauthorizedResponse } from '@/lib/core/apiResponse';

/**
 * POST /api/search/alerts
 * Body: { query: { location, propertyType, minPrice, ... }, frequency: 'daily' }
 */
export const POST = async (request: NextRequest) => {
  try {
    await connectDB();
    const sessionUser = await getSessionUser();

    if (!sessionUser || !sessionUser.userId) {
      return unauthorizedResponse('Authentication required to save alerts.');
    }

    const { query, frequency } = await request.json();

    const user: any = await User.findById(sessionUser.userId);
    if (!user) return errorResponse('User profile not found.', 404);

    user.savedSearches.push({
      query,
      alertFrequency: frequency || 'daily'
    });

    await user.save();

    return successResponse({ message: 'Search alert successfully registered.' }, 201);
  } catch (error: any) {
    console.error('[SAVE_SEARCH_ALERT_ERROR]:', error);
    return errorResponse('Failed to register search alert.', 500, error.message);
  }
};
