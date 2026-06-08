export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import connectDB from '@/lib/core/database';
import { errorResponse, successResponse } from '@/lib/core/apiResponse';
import { requireSunsetChatModeratorAccess } from '@/lib/grill/sunsetChatModeration';
import SunsetChatPost from '@/models/SunsetChatPost';

type Params = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const access = await requireSunsetChatModeratorAccess(request);
    if (access instanceof Response) return access;

    const { id } = await params;
    const body = await request.json().catch(() => ({}));

    await connectDB();

    if (body?.isPinned === true) {
      await SunsetChatPost.updateMany({ isPinned: true }, {
        isPinned: false,
        staffActionBy: access.moderatorEmail || access.user?.name || access.user?.id || 'staff',
      });
    }

    const post = await SunsetChatPost.findByIdAndUpdate(id, {
      ...(typeof body?.isPinned === 'boolean' ? { isPinned: body.isPinned } : {}),
      staffActionBy: access.moderatorEmail || access.user?.name || access.user?.id || 'staff',
    }, { new: true });

    if (!post) return errorResponse('Sunset Chat post not found.', 404);

    return successResponse({ post });
  } catch (error: any) {
    console.error('[SUNSET_CHAT_PATCH_FAILURE]:', error);
    return errorResponse('Failed to update Sunset Chat post.', 500, error.message);
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const access = await requireSunsetChatModeratorAccess(request);
    if (access instanceof Response) return access;

    const { id } = await params;
    await connectDB();
    const deleted = await SunsetChatPost.findByIdAndDelete(id);

    if (!deleted) return errorResponse('Sunset Chat post not found.', 404);

    return successResponse({ removed: true });
  } catch (error: any) {
    console.error('[SUNSET_CHAT_DELETE_FAILURE]:', error);
    return errorResponse('Failed to delete Sunset Chat post.', 500, error.message);
  }
}
