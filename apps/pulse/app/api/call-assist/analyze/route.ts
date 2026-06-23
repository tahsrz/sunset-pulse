import { NextRequest } from 'next/server';
import { analyzeCallAssist } from '@/lib/call-assist/analyzer';
import { errorResponse, successResponse } from '@/lib/core/apiResponse';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (typeof body?.transcript !== 'string') {
      return errorResponse('transcript must be a string.', 400);
    }

    const analysis = analyzeCallAssist({
      transcript: body.transcript,
      mode: body.mode === 'post-call' ? 'post-call' : 'live',
      context: typeof body.context === 'object' && body.context ? body.context : {},
      consent: typeof body.consent === 'object' && body.consent ? body.consent : {}
    });

    return successResponse(analysis);
  } catch (error: any) {
    console.error('[CALL_ASSIST_ANALYZE_FAILURE]:', error);
    return errorResponse('Failed to analyze call transcript.', 500, error.message);
  }
}
