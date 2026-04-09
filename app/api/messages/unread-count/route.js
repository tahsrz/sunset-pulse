import connectDB from '@/lib/core/database';
import Message from '@/models/Message';
import { getSessionUser } from '@/lib/core/getSessionUser';
import { successResponse, errorResponse, unauthorizedResponse } from '@/lib/core/apiResponse';

export const dynamic = 'force-dynamic';

/**
 * GET /api/messages/unread-count
 * Retrieves the total count of unread messages for the authenticated user.
 */
export const GET = async () => {
  try {
    await connectDB();
    const sessionUser = await getSessionUser();

    if (!sessionUser || !sessionUser.userId) {
      return unauthorizedResponse('Authentication required to view unread count.');
    }

    const { userId } = sessionUser;
    const count = await Message.countDocuments({
      recipient: userId,
      read: false,
    });

    return successResponse({ count });
  } catch (error: any) {
    console.error('[UNREAD_COUNT_FETCH_ERROR]:', error);
    return errorResponse('Failed to retrieve unread message count.', 500, error.message);
  }
};
