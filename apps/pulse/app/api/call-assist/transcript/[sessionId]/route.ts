export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { appendCallAssistTranscript, getCallAssistSession } from '@/lib/call-assist/sessions';
import { errorResponse, successResponse } from '@/lib/core/apiResponse';

export async function GET(_request: NextRequest, context: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await context.params;
  const session = await getCallAssistSession(sessionId);
  if (!session) return errorResponse('Call assist session not found.', 404);
  return successResponse(session);
}

export async function POST(request: NextRequest, context: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await context.params;
  const body = await request.json();
  const fragment = body?.fragment || body?.transcript;

  if (typeof fragment !== 'string') {
    return errorResponse('fragment must be a string.', 400);
  }

  const session = await appendCallAssistTranscript(sessionId, fragment, body?.source || 'manual');
  if (!session) return errorResponse('Call assist session not found.', 404);

  return successResponse(session);
}
