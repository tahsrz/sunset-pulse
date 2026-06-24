import Order from '@/models/Order';
import { generateEmployeeTicket, generatePhoneCallScript, type CartItem } from '@/lib/grill/orderRelay';
import { createRelaySession } from '@/lib/grill/relaySessions';
import { placeInteractivePhoneRelayCall, placePhoneRelayCall } from '@/lib/twilio';

export function isPaidForPhoneRelay(order: any) {
  return Boolean(order?.isPaid || ['PAID_STRIPE', 'PAID_POS'].includes(order?.paymentState));
}

export function orderItemsToCartItems(items: any[]): CartItem[] {
  return items
    .map((item) => ({
      id: String(item.id || item._id || item.name || '').trim(),
      name: String(item.name || '').trim(),
      quantity: Number(item.quantity || 0),
      price: Number(item.price || 0),
      customization: item.customization,
    }))
    .filter((item) => item.id && item.name && Number.isFinite(item.quantity) && item.quantity > 0);
}

function normalizeCallbackBaseUrl(value?: string) {
  if (!value) return null;

  const trimmed = value.trim().replace(/\/$/, '');
  if (!trimmed) return null;

  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^[a-z0-9.-]+\.[a-z]{2,}(?::\d+)?$/i.test(trimmed)) {
    return `https://${trimmed}`;
  }

  return null;
}

function isE164PhoneNumber(value: string) {
  return /^\+[1-9]\d{7,14}$/.test(value);
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
  if (!cartItems.length) {
    await Order.findByIdAndUpdate(order._id, {
      'phoneRelay.status': 'failed',
      'phoneRelay.lastError': 'Order has no valid phone relay items.',
      'phoneRelay.updatedAt': new Date(),
    });

    return {
      success: false,
      reason: 'Order has no valid phone relay items.',
      status: 400,
    };
  }

  if (!isE164PhoneNumber(to)) {
    await Order.findByIdAndUpdate(order._id, {
      'phoneRelay.status': 'failed',
      'phoneRelay.lastError': 'Phone relay destination must be a valid E.164 number.',
      'phoneRelay.updatedAt': new Date(),
    });

    return {
      success: false,
      reason: 'Phone relay destination must be a valid E.164 number.',
      status: 400,
    };
  }

  const ticket = generateEmployeeTicket(cartItems);
  const callScript = generatePhoneCallScript(cartItems, callerName);
  let relaySession = null;
  let call;

  if (interactive) {
    const publicBaseUrl = normalizeCallbackBaseUrl(
      callbackBaseUrl || process.env.PHONE_RELAY_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_DOMAIN,
    );

    if (!publicBaseUrl) {
      await Order.findByIdAndUpdate(order._id, {
        phoneRelay: {
          status: 'not_configured',
          lastError: 'Missing a valid PHONE_RELAY_PUBLIC_BASE_URL or NEXT_PUBLIC_DOMAIN for interactive phone relay callbacks.',
          updatedAt: new Date(),
        },
      });

      return {
        success: false,
        reason: 'Interactive keypad calls require a valid public callback base URL.',
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
    call = await placeInteractivePhoneRelayCall(to, twimlUrl, statusCallbackUrl, {
      relayId: relaySession.id,
    });
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
