import connectDB from '@/lib/core/database';
import User from '@/models/User';
import { getSessionUser } from '@/lib/core/getSessionUser';
import { successResponse, errorResponse, unauthorizedResponse } from '@/lib/core/apiResponse';

export const dynamic = 'force-dynamic';

export const POST = async (request) => {
  try {
    await connectDB();

    const { propertyId } = await request.json();
    const sessionUser = await getSessionUser();

    if (!sessionUser || !sessionUser.userId) {
      return unauthorizedResponse('User authentication required.');
    }

    const { userId } = sessionUser;

    // Find user in database
    const user = await User.findOne({ _id: userId });
    if (!user) return errorResponse('User profile not found.', 404);

    // Check if property is bookmarked
    const isBookmarked = user.bookmarks.includes(propertyId);

    return successResponse({ isBookmarked });
  } catch (error) {
    console.error('[BOOKMARK_CHECK_ERROR]:', error);
    return errorResponse('Failed to verify bookmark status.', 500, error.message);
  }
};
