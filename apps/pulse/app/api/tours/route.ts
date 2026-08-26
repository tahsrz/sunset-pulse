export const dynamic = 'force-dynamic';
import connectDB from '@/lib/core/database';
import TourRequest from '@/models/TourRequest';
import { getSessionUser } from '@/lib/core/getSessionUser';
import { TourRequestSchema } from '@/lib/core/validation';
import { successResponse, errorResponse, unauthorizedResponse, validationErrorResponse } from '@/lib/core/apiResponse';
import { logEvent } from '@/lib/supabase';
import { notifyTourRequest } from '@/lib/core/notifications';
import { getAgentIdFromInput } from '@/lib/sites/agentConfig';



/**
 * POST /api/tours
 * Submit a new property tour request
 */
export const POST = async (request: Request) => {
  try {
    await connectDB();
    const body = await request.json();
    const agentId = getAgentIdFromInput({ agentId: body.agentId });

    // Validate Input
    const validation = TourRequestSchema.safeParse(body);
    if (!validation.success) {
      return validationErrorResponse(validation.error.flatten().fieldErrors);
    }

    const sessionUser = await getSessionUser();
    if (!sessionUser || !sessionUser.userId) {
      return unauthorizedResponse('Authentication required to request a tour.');
    }

    const { property, preferredDate, preferredTime, tourType, userName, userEmail, userPhone, message } = validation.data;

    // Create Request
    const newTour = new TourRequest({
      property,
      user: sessionUser.userId,
      userName,
      userEmail,
      userPhone,
      preferredDate: new Date(preferredDate),
      preferredTime,
      tourType,
      message,
      agentId
    });

    await newTour.save();

    // Log Event for Intelligence Audit
    await logEvent({
      type: 'TOUR_REQUESTED',
      description: `${userName} requested a ${tourType} tour for asset ${property}.`,
      actorId: sessionUser.userId,
      actorName: userName,
      targetId: property,
      severity: 'TACTICAL',
      metadata: { preferredDate, preferredTime, tourType }
    });

    // Notify Agent via Telnyx
    await notifyTourRequest(newTour);

    return successResponse({ 
      message: 'Tour request synchronized. Tactical briefing scheduled.',
      requestId: newTour._id 
    });

  } catch (error: any) {
    console.error('[TOUR_POST_ERROR]:', error);
    return errorResponse('Failed to synchronize tour request.', 500, error.message);
  }
};
