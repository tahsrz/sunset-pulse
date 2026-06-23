export const dynamic = 'force-dynamic';

import { buildBridgeTwiML, escapeXml, xmlResponse } from '@/lib/call-assist/twiml';
import { getCallAssistSession, updateCallAssistSession } from '@/lib/call-assist/sessions';

export async function POST(request: Request, context: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await context.params;
  const session = await getCallAssistSession(sessionId);
  const formData = await request.formData();
  const digits = String(formData.get('Digits') || '');

  if (!session) {
    return xmlResponse([
      '<Response>',
      '<Say voice="Polly.Joanna" language="en-US">This call assist session is no longer available. Goodbye.</Say>',
      '</Response>',
    ].join(''));
  }

  if (digits !== '1') {
    await updateCallAssistSession(sessionId, {
      status: 'declined',
      consent: {
        ...session.consent,
        disclosureRead: true,
        callerConsented: false,
        recordingAllowed: false,
      },
    });
    return xmlResponse([
      '<Response>',
      '<Say voice="Polly.Joanna" language="en-US">No problem. I will connect you without call assist.</Say>',
      session.agentPhone ? `<Dial>${escapeXml(session.agentPhone)}</Dial>` : '',
      '</Response>',
    ].join(''));
  }

  const updated = await updateCallAssistSession(sessionId, {
    status: 'bridging',
    consent: {
      ...session.consent,
      disclosureRead: true,
      callerConsented: true,
      recordingAllowed: session.consent?.recordingAllowed !== false,
    },
  });

  return xmlResponse(buildBridgeTwiML(updated || session));
}
