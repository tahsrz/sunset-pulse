export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { errorResponse, successResponse } from '@/lib/core/apiResponse';
import { saveCallAssistSummaryToLead } from '@/lib/call-assist/sessions';

export async function POST(_request: NextRequest, context: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await context.params;
  const session = await saveCallAssistSummaryToLead(sessionId);

  if (!session) return errorResponse('Call assist session not found.', 404);
  if (session.lastError?.includes('No leadId')) {
    return errorResponse(session.lastError, 400, { sessionId });
  }

  return successResponse(session);
}
