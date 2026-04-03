import connectDB from '@/lib/core/database';
import Message from '@/models/Message';
import { getSessionUser } from '@/lib/core/getSessionUser';
import { successResponse, errorResponse, unauthorizedResponse } from '@/lib/core/apiResponse';

export const dynamic = 'force-dynamic';

// GET /api/messages/unread-count
export const GET = async (request) => {
  try {
    await connectDB();
    const sessionUser = await getSessionUser();

    if (!sessionUser || !sessionUser.userId) {
      return unauthorizedResponse();
    }

    const { userId } = sessionUser;
    const count = await Message.countDocuments({
      recipient: userId,
      read: false,
    });

    return successResponse({ count });
  } catch (error) {
    return errorResponse('Failed to retrieve unread communication count.', 500, error.message);
  }
};
