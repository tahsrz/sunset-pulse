import connectDB from '@/lib/core/database';
import Feedback from '@/models/Feedback';
import { getSessionUser } from '@/lib/core/getSessionUser';
import { successResponse, errorResponse, unauthorizedResponse, validationErrorResponse } from '@/lib/core/apiResponse';
import { applyApiRateLimit } from '@/lib/core/apiRateLimit';
import { FeedbackSchema } from '@/lib/core/validation';

export const POST = async (request: Request) => {
  try {
    await connectDB();
    
    // Rate Limiting: 3 entries per minute
    const sessionUser = await getSessionUser();
    
    if (!sessionUser || !sessionUser.userId) {
      return unauthorizedResponse('Authentication required to send feedback.');
    }

    const limitResponse = await applyApiRateLimit(sessionUser.userId, 3);
    if (limitResponse) return limitResponse;

    const body = await request.json();

    // Validate Schema
    const validation = FeedbackSchema.safeParse(body);
    if (!validation.success) {
      return validationErrorResponse(validation.error.flatten().fieldErrors);
    }

    const { name, email, subject, message, priority } = validation.data;

    // Persist to Mongo
    const newFeedback = new Feedback({
      user: sessionUser.userId,
      name,
      email,
      subject,
      message,
      priority
    });

    await newFeedback.save();

    return successResponse({ message: 'Feedback submitted successfully.', id: newFeedback._id }, 201);
  } catch (error: any) {
    console.error('[FEEDBACK_POST_FAILURE]:', error);
    return errorResponse('Failed to transmit feedback.', 500, error.message);
  }
};
