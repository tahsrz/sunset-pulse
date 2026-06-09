export const dynamic = 'force-dynamic';

import { getRelaySession, updateRelaySession } from '@/lib/grill/relaySessions';
import connectDB from '@/lib/core/database';
import Order from '@/models/Order';

function xmlResponse(xml: string) {
  return new Response(xml, {
    headers: {
      'Content-Type': 'text/xml; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

function escapeXml(value: string) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export async function GET(request: Request, context: { params: Promise<{ relayId: string }> }) {
  const { relayId } = await context.params;
  const session = await getRelaySession(relayId);
  const url = new URL(request.url);
  const section = url.searchParams.get('section');

  if (!session) {
    return xmlResponse([
      '<Response>',
      '<Say voice="Polly.Joanna" language="en-US">This order relay session is no longer available. Please contact the customer directly.</Say>',
      '</Response>',
    ].join(''));
  }

  await updateRelaySession(relayId, {
    attempts: session.attempts + 1,
    status: session.attempts > 0 ? 'repeat_requested' : 'pending',
  });

  if (session.orderId) {
    await connectDB();
    await Order.findByIdAndUpdate(session.orderId, {
      'phoneRelay.status': session.attempts > 0 ? 'repeat_requested' : 'pending',
      'phoneRelay.attempts': session.attempts + 1,
      'phoneRelay.updatedAt': new Date(),
    });
  }

  if (section === 'order') {
    return xmlResponse([
      '<Response>',
      `<Gather input="dtmf" numDigits="1" timeout="10" actionOnEmptyResult="true" method="POST" action="/api/grill/relay/input/${relayId}">`,
      `<Say voice="Polly.Joanna" language="en-US">${escapeXml(session.callScript)}</Say>`,
      '<Pause length="1" />',
      '<Say voice="Polly.Joanna" language="en-US">Press 2 to confirm the order. Press 3 to repeat the order.</Say>',
      '</Gather>',
      `<Redirect method="GET">/api/grill/relay/twiml/${relayId}?section=order</Redirect>`,
      '</Response>',
    ].join(''));
  }

  return xmlResponse([
    '<Response>',
    `<Gather input="dtmf" numDigits="1" timeout="8" actionOnEmptyResult="true" method="POST" action="/api/grill/relay/input/${relayId}">`,
    '<Say voice="Polly.Joanna" language="en-US">Hi, this is Jamie, an automated order assistant calling in a pickup order. Press 1 to skip to the order. After the order, press 2 to confirm, or press 3 to repeat.</Say>',
    '</Gather>',
    `<Redirect method="GET">/api/grill/relay/twiml/${relayId}?section=order</Redirect>`,
    '</Response>',
  ].join(''));
}
