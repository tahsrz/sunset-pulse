import connectDB from '@/lib/core/database';
import Message from '@/models/Message';
import { getSessionUser } from '@/lib/core/getSessionUser';
import { successResponse, errorResponse, unauthorizedResponse, notFoundResponse } from '@/lib/core/apiResponse';

export const dynamic = 'force-dynamic';

/**
 * PUT /api/messages/:id
 * Toggles the read status of a specific message.
 */
export const PUT = async (request, { params }) => {
  try {
    await connectDB();
    const { id } = params;
    const sessionUser = await getSessionUser();

    if (!sessionUser || !sessionUser.userId) {
      return unauthorizedResponse('Authentication required to update message status.');
    }

    const { userId } = sessionUser;
    const message = await Message.findById(id);

    if (!message) return notFoundResponse('Message');

    // Verify recipient ownership
    if (message.recipient.toString() !== userId) {
      return errorResponse('Unauthorized: Operation restricted to the message recipient.', 403);
    }

    message.read = !message.read;
    await message.save();

    return successResponse(message);
  } catch (error: any) {
    console.error('[MESSAGE_STATUS_UPDATE_ERROR]:', error);
    return errorResponse('Failed to update message status.', 500, error.message);
  }
};

/**
 * DELETE /api/messages/:id
 * Removes a specific message from the system.
 */
export const DELETE = async (request, { params }) => {
  try {
    await connectDB();
    const { id } = params;
    const sessionUser = await getSessionUser();

    if (!sessionUser || !sessionUser.userId) {
      return unauthorizedResponse('Authentication required to delete messages.');
    }

    const { userId } = sessionUser;
    const message = await Message.findById(id);

    if (!message) return notFoundResponse('Message');

    // Verify recipient ownership
    if (message.recipient.toString() !== userId) {
      return errorResponse('Unauthorized: Operation restricted to the message recipient.', 403);
    }

    await message.deleteOne();
    return successResponse({ message: 'Message successfully deleted.' });
  } catch (error: any) {
    console.error('[MESSAGE_DELETE_ERROR]:', error);
    return errorResponse('Failed to delete message.', 500, error.message);
  }
};
