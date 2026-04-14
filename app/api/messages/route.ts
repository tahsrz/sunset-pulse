import connectDB from '@/lib/core/database';
import Message from '@/models/Message';
import { getSessionUser } from '@/lib/core/getSessionUser';
import { MessageSchema } from '@/lib/core/validation';
import { successResponse, errorResponse, unauthorizedResponse, validationErrorResponse } from '@/lib/core/apiResponse';
import { applyApiRateLimit } from '@/lib/core/apiRateLimit';

export const dynamic = 'force-dynamic';

/**
 * GET /api/messages
 * Retrieves all messages for the authenticated user, prioritized by unread status
 */
export const GET = async () => {
  try {
    await connectDB();
    const sessionUser = await getSessionUser();

    if (!sessionUser || !sessionUser.userId) {
      return unauthorizedResponse('Authentication required to view messages.');
    }

    const { userId } = sessionUser;

    // Fetch all messages for the recipient, unread first and then date
    const messages = await Message.find({ recipient: userId })
      .sort({ read: 1, createdAt: -1 })
      .populate('sender', 'username')
      .populate('property', 'name');

    return successResponse(messages);
  } catch (error: any) {
    console.error('[MESSAGES_GET_ERROR]:', error);
    return errorResponse('Failed to retrieve messages.', 500, error.message);
  }
};

/**
 * POST /api/messages
 * new message regarding a property asset
 */
export const POST = async (request: Request) => {
  try {
    await connectDB();
    const body = await request.json();

    const validation = MessageSchema.safeParse(body);
    if (!validation.success) {
      return validationErrorResponse(validation.error.flatten().fieldErrors);
    }

    const { name, email, phone, message, property, recipient } = validation.data;
    const sessionUser = await getSessionUser();

    if (!sessionUser || !sessionUser.userId) {
      return unauthorizedResponse('Authentication required to send messages.');
    }

    const { userId } = sessionUser;

    // Rate Limit: 5 messages per minute
    const limitResponse = await applyApiRateLimit(userId, 5);
    if (limitResponse) return limitResponse;

    // Prevent users from messaging themselves
    if (userId === recipient) {
      return errorResponse('Users cannot send messages to themselves.', 400);
    }

    const newMessage = new Message({
      sender: userId,
      recipient,
      property,
      name,
      email,
      phone,
      body: message,
    });

    await newMessage.save();
    return successResponse({ message: 'Message successfully sent.' });
  } catch (error: any) {
    console.error('[MESSAGES_POST_ERROR]:', error);
    return errorResponse('Failed to send message.', 500, error.message);
  }
};
