import connectDB from '@/lib/core/database';
import Message from '@/models/Message';
import { getSessionUser } from '@/lib/core/getSessionUser';
import { successResponse, errorResponse, unauthorizedResponse, notFoundResponse } from '@/lib/core/apiResponse';

export const dynamic = 'force-dynamic';

// PUT /api/messages/:id
export const PUT = async (request, { params }) => {
  try {
    await connectDB();
    const { id } = params;
    const sessionUser = await getSessionUser();

    if (!sessionUser || !sessionUser.userId) {
      return unauthorizedResponse();
    }

    const { userId } = sessionUser;
    const message = await Message.findById(id);

    if (!message) return notFoundResponse('Communication');

    // Security check: Verify recipient ownership
    if (message.recipient.toString() !== userId) {
      return errorResponse('Unauthorized: Operation restricted to message recipient.', 403);
    }

    message.read = !message.read;
    await message.save();

    return successResponse(message);
  } catch (error) {
    return errorResponse('Failed to update communication status.', 500, error.message);
  }
};

// DELETE /api/messages/:id
export const DELETE = async (request, { params }) => {
  try {
    await connectDB();
    const { id } = params;
    const sessionUser = await getSessionUser();

    if (!sessionUser || !sessionUser.userId) {
      return unauthorizedResponse();
    }

    const { userId } = sessionUser;
    const message = await Message.findById(id);

    if (!message) return notFoundResponse('Communication');

    // Security check: Verify recipient ownership
    if (message.recipient.toString() !== userId) {
      return errorResponse('Unauthorized: Operation restricted to message recipient.', 403);
    }

    await message.deleteOne();
    return successResponse({ message: 'Communication purged from grid.' });
  } catch (error) {
    return errorResponse('Failed to execute communication purge.', 500, error.message);
  }
};
