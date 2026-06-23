export const dynamic = 'force-dynamic';

import { buildBridgeTwiML, buildConsentTwiML, xmlResponse } from '@/lib/call-assist/twiml';
import { getCallAssistSession, updateCallAssistSession } from '@/lib/call-assist/sessions';

export async function GET(request: Request, context: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await context.params;
  const session = await getCallAssistSession(sessionId);
  const section = new URL(request.url).searchParams.get('section');

  if (!session) {
    return xmlResponse([
      '<Response>',
      '<Say voice="Polly.Joanna" language="en-US">This call assist session is no longer available. Goodbye.</Say>',
      '</Response>',
    ].join(''));
  }

  if (!session.consent?.callerConsented && section !== 'bridge') {
    await updateCallAssistSession(sessionId, { status: 'consent_pending' });
    return xmlResponse(buildConsentTwiML(session));
  }

  await updateCallAssistSession(sessionId, { status: 'bridging' });
  return xmlResponse(buildBridgeTwiML(session));
}
