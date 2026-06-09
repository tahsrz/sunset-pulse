export const dynamic = 'force-dynamic';

import { errorResponse, successResponse } from '@/lib/core/apiResponse';
import { getRelaySession } from '@/lib/grill/relaySessions';

export async function GET(_request: Request, context: { params: Promise<{ relayId: string }> }) {
  const { relayId } = await context.params;
  const session = await getRelaySession(relayId);

  if (!session) {
    return errorResponse('Relay session not found.', 404);
  }

  return successResponse(session);
}
