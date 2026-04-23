import connectDB from '@/lib/core/database';
import TourRequest from '@/models/TourRequest';
import Property from '@/models/Property';
import { getSessionUser } from '@/lib/core/getSessionUser';
import { successResponse, errorResponse, unauthorizedResponse } from '@/lib/core/apiResponse';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/tours
 * Retrieve all tour requests for the admin board.
 */
export const GET = async () => {
  try {
    await connectDB();
    const sessionUser = await getSessionUser();

    // In a real scenario, check for admin role
    if (!sessionUser || !sessionUser.userId) {
      // return unauthorizedResponse('Admin access required.');
    }

    const tours = await TourRequest.find({})
      .sort({ preferredDate: 1, preferredTime: 1 })
      .populate({
        path: 'property',
        select: 'name location location_geo rates images square_feet',
        model: Property
      });

    return successResponse(tours);
  } catch (error: any) {
    console.error('[ADMIN_TOURS_GET_ERROR]:', error);
    return errorResponse('Failed to retrieve tour grid.', 500, error.message);
  }
};

/**
 * PATCH /api/admin/tours
 * Update tour status (Confirm, Cancel, etc.)
 */
export const PATCH = async (request: Request) => {
  try {
    await connectDB();
    const body = await request.json();
    const { id, status } = body;

    if (!id || !status) {
      return errorResponse('ID and status required.', 400);
    }

    const updatedTour = await TourRequest.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );

    if (!updatedTour) return errorResponse('Mission not found.', 404);

    return successResponse(updatedTour);
  } catch (error: any) {
    return errorResponse('Status update failed.', 500, error.message);
  }
};
