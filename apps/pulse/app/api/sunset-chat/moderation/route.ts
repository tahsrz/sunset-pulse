export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { successResponse } from '@/lib/core/apiResponse';
import { getSunsetChatModeratorAccess } from '@/lib/grill/sunsetChatModeration';

export async function GET(request: NextRequest) {
  const access = await getSunsetChatModeratorAccess(request);

  return successResponse({
    canModerate: access.allowed,
    moderator: access.allowed
      ? {
          email: access.moderatorEmail,
          name: access.user?.name || null,
          role: access.user?.role || access.mode,
        }
      : null,
  });
}
