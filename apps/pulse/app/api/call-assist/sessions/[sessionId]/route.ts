export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { errorResponse, successResponse } from '@/lib/core/apiResponse';
import { finalizeCallAssistSession, getCallAssistSession } from '@/lib/call-assist/sessions';

export async function GET(_request: NextRequest, context: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await context.params;
  const session = await getCallAssistSession(sessionId);
  if (!session) return errorResponse('Call assist session not found.', 404);
  return successResponse(session);
}

export async function POST(request: NextRequest, context: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await context.params;
  const body = await request.json();

  if (body?.action !== 'finalize') {
    return errorResponse('Unsupported call assist session action.', 400);
  }

  const session = await finalizeCallAssistSession(sessionId);
  if (!session) return errorResponse('Call assist session not found.', 404);
  return successResponse(session);
}
