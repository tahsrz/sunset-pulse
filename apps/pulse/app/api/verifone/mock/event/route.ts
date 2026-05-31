export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import connectDB from '@/lib/core/database';
import Order from '@/models/Order';
import { errorResponse, successResponse } from '@/lib/core/apiResponse';
import { normalizeVerifoneEvent } from '@/lib/verifone/events';
import { sha256Digest } from '@/lib/verifone/signature';
import { applyVerifoneEventToOrder } from '@/lib/verifone/stateMachine';

export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV === 'production' && process.env.VERIFONE_ENABLE_MOCK !== 'true') {
    return errorResponse('Verifone mock endpoint is disabled.', 404);
  }

  const body = await req.text();

  try {
    await connectDB();

    const event = normalizeVerifoneEvent(JSON.parse(body));
    const duplicateEvent = await Order.findOne({ 'posEvents.eventId': event.eventId }).select('_id');
    if (duplicateEvent) {
      return successResponse({ duplicate: true, orderId: duplicateEvent._id, eventId: event.eventId });
    }

    const order = event.orderId
      ? await Order.findById(event.orderId)
      : await Order.findOne({ pickupCode: event.pickupCode });

    if (!order) {
      return errorResponse('Order not found for mock Verifone event.', 404);
    }

    const { updates, posEvent } = applyVerifoneEventToOrder(event, sha256Digest(body));
    Object.entries(updates).forEach(([path, value]) => order.set(path, value));
    order.posEvents.push(posEvent);
    await order.save();

    return successResponse({
      orderId: order._id,
      eventId: event.eventId,
      paymentState: order.paymentState,
      mock: true,
    });
  } catch (error: any) {
    console.error('[VERIFONE_MOCK_EVENT_FAILURE]:', error);
    return errorResponse('Failed to process mock Verifone event.', 400, error.message);
  }
}
