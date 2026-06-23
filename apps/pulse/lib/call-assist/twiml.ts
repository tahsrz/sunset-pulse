import type { CallAssistSessionRecord } from './sessions';

export function xmlResponse(xml: string) {
  return new Response(xml, {
    headers: {
      'Content-Type': 'text/xml; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

export function escapeXml(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function emptyTwilioResponse() {
  return xmlResponse('<Response></Response>');
}

export function buildConsentTwiML(session: CallAssistSessionRecord) {
  return [
    '<Response>',
    `<Gather input="dtmf" numDigits="1" timeout="8" actionOnEmptyResult="true" method="POST" action="/api/call-assist/consent/${escapeXml(session.id)}">`,
    '<Say voice="Polly.Joanna" language="en-US">Hi, this is Jamie from Sunset Pulse. This call can use live notes to help keep details accurate for the agent. Press 1 if that is okay. Press 9 to continue without call assist.</Say>',
    '</Gather>',
    `<Redirect method="GET">/api/call-assist/twiml/${escapeXml(session.id)}</Redirect>`,
    '</Response>',
  ].join('');
}

export function buildBridgeTwiML(session: CallAssistSessionRecord) {
  const streamUrl = session.streamUrl;
  const agentPhone = session.agentPhone;
  const callbackBaseUrl = session.bridgeUrl?.replace(/\/$/, '');
  const streamStatusCallback = callbackBaseUrl
    ? `${callbackBaseUrl}/api/call-assist/stream-status/${session.id}`
    : `/api/call-assist/stream-status/${session.id}`;

  if (!agentPhone) {
    return [
      '<Response>',
      '<Say voice="Polly.Joanna" language="en-US">This call assist session is missing an agent phone number. Please try again from Sunset Pulse.</Say>',
      '</Response>',
    ].join('');
  }

  if (!streamUrl || !/^wss:\/\//i.test(streamUrl)) {
    return [
      '<Response>',
      '<Say voice="Polly.Joanna" language="en-US">Call assist is ready, but the secure media stream is not configured. Connecting you without live notes.</Say>',
      `<Dial>${escapeXml(agentPhone)}</Dial>`,
      '</Response>',
    ].join('');
  }

  if (session.consent?.recordingAllowed === false) {
    return [
      '<Response>',
      '<Say voice="Polly.Joanna" language="en-US">Thanks. Recording is off, so I am connecting you without live notes.</Say>',
      `<Dial>${escapeXml(agentPhone)}</Dial>`,
      '</Response>',
    ].join('');
  }

  return [
    '<Response>',
    '<Say voice="Polly.Joanna" language="en-US">Thanks. I am connecting the call now.</Say>',
    '<Start>',
    `<Stream name="${escapeXml(session.streamName || `call-assist-${session.id}`)}" url="${escapeXml(streamUrl)}" track="both_tracks" statusCallback="${escapeXml(streamStatusCallback)}" statusCallbackMethod="POST">`,
    `<Parameter name="sessionId" value="${escapeXml(session.id)}" />`,
    `<Parameter name="leadId" value="${escapeXml(session.leadId || '')}" />`,
    `<Parameter name="agentPhone" value="${escapeXml(agentPhone)}" />`,
    '</Stream>',
    '</Start>',
    `<Dial>${escapeXml(agentPhone)}</Dial>`,
    '</Response>',
  ].join('');
}
