export const dynamic = 'force-dynamic';

import { emptyTwilioResponse } from '@/lib/call-assist/twiml';
import { getCallAssistSession, updateCallAssistSession } from '@/lib/call-assist/sessions';

export async function POST(request: Request, context: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await context.params;
  const session = await getCallAssistSession(sessionId);
  const formData = await request.formData();

  if (!session) return emptyTwilioResponse();

  const streamEvent = String(formData.get('StreamEvent') || '').toLowerCase();
  const streamSid = String(formData.get('StreamSid') || '');
  const streamName = String(formData.get('StreamName') || '');
  const streamError = String(formData.get('StreamError') || '');
  const updates: any = {
    streamSid: streamSid || session.streamSid,
    streamName: streamName || session.streamName,
  };

  if (streamEvent === 'stream-started') {
    updates.status = 'streaming';
  } else if (streamEvent === 'stream-error') {
    updates.status = 'failed';
    updates.lastError = streamError || 'Twilio stream error.';
  } else if (streamEvent === 'stream-stopped') {
    updates.status = session.status === 'failed' ? 'failed' : 'completed';
    updates.endedAt = new Date().toISOString();
  }

  await updateCallAssistSession(sessionId, updates);
  return emptyTwilioResponse();
}
