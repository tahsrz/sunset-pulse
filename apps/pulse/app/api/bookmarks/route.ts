export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { unstable_cache, revalidateTag } from 'next/cache';
import connectDB from '@/lib/core/database';
import User from '@/models/User';
import Property from '@/models/Property';
import { getSessionUser } from '@/lib/core/getSessionUser';
import { successResponse, errorResponse, unauthorizedResponse } from '@/lib/core/apiResponse';

/**
 * Granular cached helper for bookmarked assets, keyed by user and array of IDs.
 */
const getCachedBookmarks = (userId: string, bookmarkIds: any[]) => {
  return unstable_cache(
    async () => {
      await connectDB();
      const bookmarks = await Property.find({ _id: { $in: bookmarkIds } }).lean();
      return JSON.parse(JSON.stringify(bookmarks));
    },
    ['user-bookmarks', userId, JSON.stringify(bookmarkIds)],
    { tags: [`bookmarks-${userId}`] }
  )();
};

// GET /api/bookmarks
export const GET = async () => {
  try {
    await connectDB();
    const sessionUser = await getSessionUser();

    if (!sessionUser || !sessionUser.userId) {
      return unauthorizedResponse();
    }

    const { user: authUser } = sessionUser;
    const user = await User.findOne({ email: authUser.email });
    
    if (!user) {
      return errorResponse('Operator profile not found.', 404);
    }

    // Load from App Router cache
    const bookmarks = await getCachedBookmarks(sessionUser.userId, user.bookmarks);
    return successResponse(bookmarks);
  } catch (error: any) {
    return errorResponse('Failed to retrieve bookmarked assets.', 500, error.message);
  }
};

export const POST = async (request: NextRequest) => {
  try {
    await connectDB();
    const { propertyId } = await request.json();
    const sessionUser = await getSessionUser();

    if (!sessionUser || !sessionUser.userId) {
      return unauthorizedResponse();
    }

    const { user: authUser } = sessionUser;
    const user = await User.findOne({ email: authUser.email });

    if (!user) {
      return errorResponse('Operator profile not found.', 404);
    }

    let isBookmarked = (user as any).bookmarks.includes(propertyId);
    let message;

    if (isBookmarked) {
      (user as any).bookmarks.pull(propertyId);
      message = 'Asset removed from watchlist.';
      isBookmarked = false;
    } else {
      (user as any).bookmarks.push(propertyId);
      message = 'Asset added to watchlist.';
      isBookmarked = true;
    }

    await user.save();

    // Purge the specific user's cached bookmarks on-demand
    revalidateTag(`bookmarks-${sessionUser.userId}`);

    return successResponse({ message, isBookmarked });
  } catch (error: any) {
    return errorResponse('Failed to update asset watchlist.', 500, error.message);
  }
};