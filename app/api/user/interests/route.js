import connectDB from '@/lib/core/database';
import User from '@/models/User';
import { getSessionUser } from '@/lib/core/getSessionUser';
import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    await connectDB();
    const sessionUser = await getSessionUser();

    if (!sessionUser || !sessionUser.userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { interests } = await req.json();

    if (!interests) {
      return new NextResponse('Interests required', { status: 400 });
    }

    const user = await User.findByIdAndUpdate(
      sessionUser.userId,
      { currentInterests: interests },
      { new: true }
    );

    console.log(`📡 [JAMIE_INTEL] Interests synchronized for user ${user._id}: ${interests}`);

    return NextResponse.json({ success: true, interests: user.currentInterests });
  } catch (error) {
    console.error('Interests Sync Error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
