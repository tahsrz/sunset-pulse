import connectDB from '@/config/database';
import User from '@/models/User';
import { getSessionUser } from '@/utils/getSessionUser';

/**
 * POST /api/search/alerts
 * Body: { query: { location, propertyType, minPrice, ... }, frequency: 'daily' }
 */
export const POST = async (request) => {
  try {
    await connectDB();
    const sessionUser = await getSessionUser();

    if (!sessionUser || !sessionUser.userId) {
      return new Response('Unauthorized', { status: 401 });
    }

    const { query, frequency } = await request.json();

    const user = await User.findById(sessionUser.userId);
    if (!user) return new Response('User not found', { status: 404 });

    user.savedSearches.push({
      query,
      alertFrequency: frequency || 'daily'
    });

    await user.save();

    return new Response(JSON.stringify({ message: 'Search alert saved' }), { status: 201 });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to save alert' }), { status: 500 });
  }
};
