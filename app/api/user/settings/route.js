import connectDB from '@/lib/core/database';
import User from '@/models/User';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/authOptions';
import { checkRateLimit } from '@/lib/core/rateLimit';

export const PATCH = async (request) => {
  try {
    await connectDB();

    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return new Response('User ID is required', { status: 401 });
    }

    const { id } = session.user;
    
    // Rate Limiting: 10 requests per minute
    const { isLimited } = await checkRateLimit(id, 10);
    if (isLimited) {
      return new Response('Too many requests. Please try again in a minute.', { status: 429 });
    }

    const body = await request.json();

    const { isAdvancedMode, customKeybind } = body;

    // Server-side Validation
    if (typeof customKeybind !== 'undefined') {
      if (typeof customKeybind !== 'string' || customKeybind.length !== 1 || !/[a-zA-Z0-9]/.test(customKeybind)) {
        return new Response('Invalid keybind format', { status: 400 });
      }
    }

    const user = await User.findById(id);

    if (!user) {
      return new Response('User not found', { status: 404 });
    }

    // Update fields
    if (typeof isAdvancedMode === 'boolean') {
      user.isAdvancedMode = isAdvancedMode;
    }

    if (customKeybind) {
      user.customKeybind = customKeybind.toUpperCase();
    }

    await user.save();

    // Return only what is necessary
    return new Response(JSON.stringify({
      isAdvancedMode: user.isAdvancedMode,
      customKeybind: user.customKeybind
    }), {
      status: 200,
    });
  } catch (error) {
    console.error(error);
    return new Response('Something went wrong', { status: 500 });
  }
};
