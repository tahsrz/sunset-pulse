export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import connectDB from '@/lib/core/database';
import Message from '@/models/Message';
import { getSessionUser } from '@/lib/core/getSessionUser';
import { successResponse, errorResponse, unauthorizedResponse, notFoundResponse } from '@/lib/core/apiResponse';



// PUT /api/messages/:id
export const PUT = async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  try {
    await connectDB();
    const { id } = await params;
    const sessionUser = await getSessionUser();

    if (!sessionUser || !sessionUser.userId) {
      return unauthorizedResponse();
    }

    const { userId } = sessionUser;
    const message = await Message.findById(id);

    if (!message) return notFoundResponse('Communication');

    //  Verify recipient ownership (put)
    if (message.recipient.toString() !== userId) {
      return errorResponse('Unauthorized: Operation restricted to message recipient.', 403);
    }

    (message as any).read = !(message as any).read;
    await message.save();

    return successResponse(message);
  } catch (error: any) {
    return errorResponse('Failed to update communication status.', 500, error.message);
  }
};

// DELETE /api/messages/:id
export const DELETE = async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  try {
    await connectDB();
    const { id } = await params;
    const sessionUser = await getSessionUser();

    if (!sessionUser || !sessionUser.userId) {
      return unauthorizedResponse();
    }

    const { userId } = sessionUser;
    const message = await Message.findById(id);

    if (!message) return notFoundResponse('Communication');

    // verify recipient ownership (delete)
    if (message.recipient.toString() !== userId) {
      return errorResponse('Unauthorized: Operation restricted to message recipient.', 403);
    }

    await message.deleteOne();
    return successResponse({ message: 'Communication purged from grid.' });
  } catch (error: any) {
    return errorResponse('Failed to execute communication purge.', 500, error.message);
  }
};