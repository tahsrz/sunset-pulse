export const dynamic = 'force-dynamic';

import { emptyTwilioResponse } from '@/lib/call-assist/twiml';
import { finalizeCallAssistSession, getCallAssistSession, updateCallAssistSession } from '@/lib/call-assist/sessions';

export async function POST(request: Request, context: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await context.params;
  const session = await getCallAssistSession(sessionId);
  const formData = await request.formData();

  if (!session) return emptyTwilioResponse();

  const callStatus = String(formData.get('CallStatus') || '').toLowerCase();
  const callSid = String(formData.get('CallSid') || '');

  if (callStatus === 'completed') {
    await finalizeCallAssistSession(sessionId);
  } else if (callStatus === 'failed' || callStatus === 'busy' || callStatus === 'no-answer') {
    await updateCallAssistSession(sessionId, {
      status: 'failed',
      callSid: callSid || session.callSid,
      lastError: `Twilio call ended with status ${callStatus}.`,
      endedAt: new Date().toISOString(),
    });
  } else if (callSid) {
    await updateCallAssistSession(sessionId, {
      callSid,
    });
  }

  return emptyTwilioResponse();
}
