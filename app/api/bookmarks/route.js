import connectDB from '@/lib/core/database';
import User from '@/models/User';
import Property from '@/models/Property';
import { getSessionUser } from '@/lib/core/getSessionUser';
import { successResponse, errorResponse, unauthorizedResponse } from '@/lib/core/apiResponse';

export const dynamic = 'force-dynamic';

// GET /api/bookmarks
export const GET = async () => {
  try {
    await connectDB();
    const sessionUser = await getSessionUser();

    if (!sessionUser || !sessionUser.userId) {
      return unauthorizedResponse();
    }

    const { userId } = sessionUser;
    const user = await User.findOne({ _id: userId });
    
    if (!user) {
      return errorResponse('Operator profile not found.', 404);
    }

    const bookmarks = await Property.find({ _id: { $in: user.bookmarks } });
    return successResponse(bookmarks);
  } catch (error) {
    return errorResponse('Failed to retrieve bookmarked assets.', 500, error.message);
  }
};

export const POST = async (request) => {
  try {
    await connectDB();
    const { propertyId } = await request.json();
    const sessionUser = await getSessionUser();

    if (!sessionUser || !sessionUser.userId) {
      return unauthorizedResponse();
    }

    const { userId } = sessionUser;
    const user = await User.findOne({ _id: userId });

    if (!user) {
      return errorResponse('Operator profile not found.', 404);
    }

    let isBookmarked = user.bookmarks.includes(propertyId);
    let message;

    if (isBookmarked) {
      user.bookmarks.pull(propertyId);
      message = 'Asset removed from watchlist.';
      isBookmarked = false;
    } else {
      user.bookmarks.push(propertyId);
      message = 'Asset added to watchlist.';
      isBookmarked = true;
    }

    await user.save();
    return successResponse({ message, isBookmarked });
  } catch (error) {
    return errorResponse('Failed to update asset watchlist.', 500, error.message);
  }
};
