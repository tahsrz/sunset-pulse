import connectDB from '@/lib/core/database';
import Message from '@/models/Message';
import { getSessionUser } from '@/lib/core/getSessionUser';
import { MessageSchema } from '@/lib/core/validation';
import { successResponse, errorResponse, unauthorizedResponse, validationErrorResponse } from '@/lib/core/apiResponse';

export const dynamic = 'force-dynamic';

// GET /api/messages
export const GET = async () => {
  try {
    await connectDB();
    const sessionUser = await getSessionUser();

    if (!sessionUser || !sessionUser.userId) {
      return unauthorizedResponse();
    }

    const { userId } = sessionUser;

    const readMessages = await Message.find({ recipient: userId, read: true })
      .sort({ createdAt: -1 })
      .populate('sender', 'username')
      .populate('property', 'name');

    const unreadMessages = await Message.find({ recipient: userId, read: false })
      .sort({ createdAt: -1 })
      .populate('sender', 'username')
      .populate('property', 'name');

    return successResponse([...unreadMessages, ...readMessages]);
  } catch (error) {
    return errorResponse('Failed to fetch message intercept feed.', 500, error.message);
  }
};

// POST /api/messages
export const POST = async (request) => {
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
      return unauthorizedResponse();
    }

    const { userId } = sessionUser;

    // Tactical Check: Prevent self-intercepts
    if (userId === recipient) {
      return errorResponse('Operation failed: Communications cannot be self-intercepted.', 400);
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
    return successResponse({ message: 'Communication secured and dispatched.' });
  } catch (error) {
    return errorResponse('Critical failure in message dispatch.', 500, error.message);
  }
};
