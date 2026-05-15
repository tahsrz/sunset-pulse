export const dynamic = 'force-dynamic';
import connectDB from '@/lib/core/database';
import User from '@/models/User';
import { getSessionUser } from '@/lib/core/getSessionUser';
import { successResponse, errorResponse, unauthorizedResponse } from '@/lib/core/apiResponse';

export async function POST(req: Request) {
  try {
    await connectDB();
    const sessionUser = await getSessionUser();

    if (!sessionUser || !sessionUser.userId) {
      return unauthorizedResponse('Authentication required to synchronize interests.');
    }

    const { interests } = await req.json();

    if (!interests) {
      return errorResponse('User interests data required.', 400);
    }

    const user = await User.findOneAndUpdate(
      { email: sessionUser.user.email },
      { currentInterests: interests },
      { new: true }
    );

    if (!user) return errorResponse('User profile not found.', 404);

    console.log(`📡 [INTERESTS_SYNC] Synchronized for user ${user._id}: ${interests}`);

    return successResponse({ success: true, interests: user.currentInterests });
  } catch (error: any) {
    console.error('Interests Sync Error:', error);
    return errorResponse('Failed to synchronize user interests.', 500, error.message);
  }
}
