export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import connectDB from '@/lib/core/database';
import { errorResponse, successResponse } from '@/lib/core/apiResponse';
import { assertTestEndpointAllowed } from '@/lib/core/runtimeSafety';
import { generateEmployeeTicket, generatePhoneCallScript, type CartItem } from '@/lib/grill/orderRelay';
import { dispatchPaidOrderPhoneRelay, isPaidForPhoneRelay, orderItemsToCartItems } from '@/lib/grill/phoneRelay';
import Order from '@/models/Order';

function isAuthorized(request: NextRequest) {
  const configuredSecret = process.env.PHONE_RELAY_TEST_SECRET;
  const providedSecret = request.headers.get('x-relay-test-secret');

  return Boolean(configuredSecret && providedSecret && providedSecret === configuredSecret);
}

function validateItems(items: unknown): items is CartItem[] {
  return Array.isArray(items) && items.length > 0 && items.every((item: any) => (
    item
    && typeof item.id === 'string'
    && typeof item.name === 'string'
    && typeof item.quantity === 'number'
  ));
}

export async function POST(request: NextRequest) {
  try {
    assertTestEndpointAllowed('Phone relay test-call endpoint');

    if (!isAuthorized(request)) {
      return errorResponse('Unauthorized phone relay test request.', 401);
    }

    const body = await request.json();
    const { to, items, orderId, callerName = 'Jamie', dryRun = true, interactive = false, callbackBaseUrl } = body;

    let cartItems: CartItem[];
    let paidOrder = null;

    if (orderId) {
      await connectDB();
      paidOrder = await Order.findById(orderId).lean();

      if (!paidOrder) {
        return errorResponse('Order not found.', 404);
      }

      cartItems = orderItemsToCartItems(paidOrder.items || []);
    } else {
      if (!validateItems(items)) {
        return errorResponse('items must be a non-empty array of structured cart items, or provide orderId.', 400);
      }

      cartItems = items;
    }

    const ticket = generateEmployeeTicket(cartItems);
    const callScript = generatePhoneCallScript(cartItems, callerName);

    if (dryRun) {
      return successResponse({
        dryRun: true,
        interactive,
        orderId: orderId || null,
        paymentState: paidOrder?.paymentState || null,
        isPaid: paidOrder?.isPaid || false,
        ticket: ticket.ticket,
        callScript: callScript.script,
        madeDifferent: callScript.madeDifferent,
      });
    }

    if (typeof to !== 'string' || !to.startsWith('+')) {
      return errorResponse('to must be an E.164 phone number, like +15551234567.', 400);
    }

    if (!orderId) {
      return errorResponse('Real phone relay calls require orderId. Raw items are allowed only for dryRun template tuning.', 400);
    }

    if (!isPaidForPhoneRelay(paidOrder)) {
      return errorResponse('Order must be paid before phone relay can place the call.', 402, {
        orderId,
        isPaid: paidOrder?.isPaid || false,
        paymentState: paidOrder?.paymentState || 'UNPAID',
      });
    }

    const relay = await dispatchPaidOrderPhoneRelay({
      order: paidOrder,
      to,
      callerName,
      interactive,
      callbackBaseUrl: typeof callbackBaseUrl === 'string' ? callbackBaseUrl : undefined,
    });

    if (!relay.success) {
      return errorResponse(relay.reason || 'Failed to place phone relay test call.', relay.status || 502, relay);
    }

    return successResponse({
      dryRun: false,
      orderId,
      ticket: ticket.ticket,
      callScript: callScript.script,
      madeDifferent: callScript.madeDifferent,
      interactive,
      relaySession: relay.relaySession,
      call: relay.call,
    });
  } catch (error: any) {
    if (error?.status === 404) {
      return errorResponse('Not found.', 404);
    }

    console.error('[PHONE_RELAY_TEST_CALL_FAILURE]:', error);
    return errorResponse('Failed to generate or place phone relay test call.', 500, error.message);
  }
}
