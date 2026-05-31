export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import connectDB from '@/lib/core/database';
import Order from '@/models/Order';
import { errorResponse, successResponse } from '@/lib/core/apiResponse';
import { normalizeVerifoneEvent } from '@/lib/verifone/events';
import { verifyVerifoneSignature } from '@/lib/verifone/signature';
import { applyVerifoneEventToOrder } from '@/lib/verifone/stateMachine';

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = verifyVerifoneSignature(body, req.headers);

  if (signature.ok === false) {
    return errorResponse(signature.message, signature.status);
  }

  try {
    await connectDB();

    const event = normalizeVerifoneEvent(JSON.parse(body));
    const duplicateEvent = await Order.findOne({ 'posEvents.eventId': event.eventId }).select('_id');
    if (duplicateEvent) {
      return successResponse({ duplicate: true, orderId: duplicateEvent._id, eventId: event.eventId });
    }

    if (event.posTransactionId) {
      const duplicateTransaction = await Order.findOne({
        'posProperties.posTransactionId': event.posTransactionId,
        ...(event.orderId ? { _id: { $ne: event.orderId } } : {}),
      }).select('_id');

      if (duplicateTransaction) {
        return errorResponse('Duplicate POS transaction id is already attached to another order.', 409);
      }
    }

    const order = event.orderId
      ? await Order.findById(event.orderId)
      : await Order.findOne({ pickupCode: event.pickupCode });

    if (!order) {
      return errorResponse('Order not found for Verifone event.', 404);
    }

    const { updates, posEvent } = applyVerifoneEventToOrder(event, signature.digest);

    Object.entries(updates).forEach(([path, value]) => order.set(path, value));
    order.posEvents.push(posEvent);
    await order.save();

    return successResponse({
      orderId: order._id,
      eventId: event.eventId,
      paymentState: order.paymentState,
      posSyncStatus: order.posProperties?.posSyncStatus,
    });
  } catch (error: any) {
    console.error('[VERIFONE_WEBHOOK_FAILURE]:', error);
    return errorResponse('Failed to process Verifone webhook.', 400, error.message);
  }
}
