import Order from '@/models/Order';
import { generateEmployeeTicket, generatePhoneCallScript, type CartItem } from '@/lib/grill/orderRelay';
import { createRelaySession } from '@/lib/grill/relaySessions';
import { placeInteractivePhoneRelayCall, placePhoneRelayCall } from '@/lib/twilio';

export function isPaidForPhoneRelay(order: any) {
  return Boolean(order?.isPaid || ['PAID_STRIPE', 'PAID_POS'].includes(order?.paymentState));
}

export function orderItemsToCartItems(items: any[]): CartItem[] {
  return items.map((item) => ({
    id: String(item.id || item._id || item.name),
    name: item.name,
    quantity: item.quantity,
    price: item.price,
    customization: item.customization,
  }));
}

export async function dispatchPaidOrderPhoneRelay({
  order,
  to,
  callerName = 'Jamie',
  interactive = true,
  callbackBaseUrl,
}: {
  order: any;
  to: string;
  callerName?: string;
  interactive?: boolean;
  callbackBaseUrl?: string;
}) {
  if (!isPaidForPhoneRelay(order)) {
    return {
      success: false,
      reason: 'Order must be paid before phone relay can place the call.',
      status: 402,
    };
  }

  const cartItems = orderItemsToCartItems(order.items || []);
  const ticket = generateEmployeeTicket(cartItems);
  const callScript = generatePhoneCallScript(cartItems, callerName);
  let relaySession = null;
  let call;

  if (interactive) {
    const publicBaseUrl = callbackBaseUrl || process.env.PHONE_RELAY_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_DOMAIN;

    if (!publicBaseUrl || !/^https?:\/\//i.test(publicBaseUrl)) {
      await Order.findByIdAndUpdate(order._id, {
        phoneRelay: {
          status: 'not_configured',
          lastError: 'Missing PHONE_RELAY_PUBLIC_BASE_URL or NEXT_PUBLIC_DOMAIN for interactive phone relay callbacks.',
          updatedAt: new Date(),
        },
      });

      return {
        success: false,
        reason: 'Interactive keypad calls require a public callback base URL.',
        status: 400,
        ticket: ticket.ticket,
        callScript: callScript.script,
      };
    }

    relaySession = await createRelaySession({
      orderId: String(order._id),
      ticket: ticket.ticket,
      callScript: callScript.script,
      madeDifferent: callScript.madeDifferent,
    });

    await Order.findByIdAndUpdate(order._id, {
      phoneRelay: {
        status: 'pending',
        relayId: relaySession.id,
        attempts: 0,
        lastCalledAt: new Date(),
        updatedAt: new Date(),
      },
    });

    const normalizedBaseUrl = publicBaseUrl.replace(/\/$/, '');
    const twimlUrl = `${normalizedBaseUrl}/api/grill/relay/twiml/${relaySession.id}`;
    const statusCallbackUrl = `${normalizedBaseUrl}/api/grill/relay/call-status/${relaySession.id}`;
    call = await placeInteractivePhoneRelayCall(to, twimlUrl, statusCallbackUrl);
  } else {
    call = await placePhoneRelayCall(to, callScript.script);
  }

  if (!call.success) {
    await Order.findByIdAndUpdate(order._id, {
      'phoneRelay.status': 'failed',
      'phoneRelay.lastError': call.error || call.reason || 'Phone relay call failed.',
      'phoneRelay.updatedAt': new Date(),
    });

    return {
      success: false,
      status: 502,
      ticket: ticket.ticket,
      callScript: callScript.script,
      relaySession,
      call,
    };
  }

  await Order.findByIdAndUpdate(order._id, {
    'phoneRelay.status': interactive ? 'pending' : 'sent',
    'phoneRelay.relayId': relaySession?.id,
    'phoneRelay.callSid': call.sid,
    'phoneRelay.lastCalledAt': new Date(),
    'phoneRelay.updatedAt': new Date(),
  });

  return {
    success: true,
    ticket: ticket.ticket,
    callScript: callScript.script,
    madeDifferent: callScript.madeDifferent,
    relaySession,
    call,
  };
}
