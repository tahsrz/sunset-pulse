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

async function persistRelayStatus(session: any, updates: Record<string, any>) {
  if (!session?.orderId) return;

  await connectDB();
  await Order.findByIdAndUpdate(session.orderId, updates);
}

export async function POST(request: Request, context: { params: Promise<{ relayId: string }> }) {
  const { relayId } = await context.params;
  const session = getRelaySession(relayId);
  const formData = await request.formData();
  const digits = String(formData.get('Digits') || '');

  if (!session) {
    return xmlResponse([
      '<Response>',
      '<Say voice="Polly.Joanna" language="en-US">This order relay session is no longer available. Please contact the customer directly.</Say>',
      '</Response>',
    ].join(''));
  }

  if (digits === '1') {
    updateRelaySession(relayId, {
      status: 'pending',
      lastDigits: digits,
    });
    await persistRelayStatus(session, {
      'phoneRelay.status': 'pending',
      'phoneRelay.lastDigits': digits,
      'phoneRelay.updatedAt': new Date(),
    });

    return xmlResponse([
      '<Response>',
      `<Redirect method="GET">/api/grill/relay/twiml/${relayId}?section=order</Redirect>`,
      '</Response>',
    ].join(''));
  }

  if (digits === '2') {
    updateRelaySession(relayId, {
      status: 'confirmed',
      lastDigits: digits,
    });
    await persistRelayStatus(session, {
      'phoneRelay.status': 'confirmed',
      'phoneRelay.lastDigits': digits,
      'phoneRelay.confirmedAt': new Date(),
      'phoneRelay.updatedAt': new Date(),
    });

    return xmlResponse([
      '<Response>',
      '<Say voice="Polly.Joanna" language="en-US">Thank you. The order is confirmed for pickup. Goodbye.</Say>',
      '</Response>',
    ].join(''));
  }

  if (digits === '3') {
    updateRelaySession(relayId, {
      status: 'repeat_requested',
      lastDigits: digits,
    });
    await persistRelayStatus(session, {
      'phoneRelay.status': 'repeat_requested',
      'phoneRelay.lastDigits': digits,
      'phoneRelay.updatedAt': new Date(),
    });

    return xmlResponse([
      '<Response>',
      `<Redirect method="GET">/api/grill/relay/twiml/${relayId}?section=order</Redirect>`,
      '</Response>',
    ].join(''));
  }

  updateRelaySession(relayId, {
    status: 'no_input',
    lastDigits: digits,
  });
  await persistRelayStatus(session, {
    'phoneRelay.status': 'no_input',
    'phoneRelay.lastDigits': digits,
    'phoneRelay.updatedAt': new Date(),
  });

  return xmlResponse([
    '<Response>',
    '<Say voice="Polly.Joanna" language="en-US">That input was not recognized. This order will be flagged for human follow up. Goodbye.</Say>',
    '</Response>',
  ].join(''));
}
