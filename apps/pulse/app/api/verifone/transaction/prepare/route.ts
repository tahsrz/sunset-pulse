export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import connectDB from '@/lib/core/database';
import Order from '@/models/Order';
import { errorResponse, successResponse } from '@/lib/core/apiResponse';
import { requireVerifoneEnabled, requireVerifoneMode } from '@/lib/verifone/config';
import { requireKdsAccess } from '@/lib/kds/access';

export async function POST(req: NextRequest) {
  const disabled = requireVerifoneEnabled();
  if (disabled) return disabled;

  const modeBlocked = requireVerifoneMode('live');
  if (modeBlocked) return modeBlocked;

  try {
    const access = await requireKdsAccess(req);
    if (access instanceof Response) return access;

    await connectDB();

    const body = await req.json();
    const { orderId, terminalId, bridgeId } = body || {};

    if (!orderId) {
      return errorResponse('orderId is required.', 400);
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return errorResponse('Order not found.', 404);
    }

    const paymentState = order.paymentState || (order.isPaid ? 'PAID_STRIPE' : 'UNPAID');
    if (['PAID_STRIPE', 'PAID_POS'].includes(paymentState)) {
      return errorResponse('Order is already paid.', 409);
    }

    if (['REFUNDED', 'VOIDED'].includes(paymentState) || order.status === 'cancelled') {
      return errorResponse('Order is not eligible for POS tender.', 409);
    }

    order.paymentState = 'PENDING_POS_TENDER';
    order.posProperties = {
      ...(order.posProperties?.toObject?.() || order.posProperties || {}),
      terminalId: terminalId || order.posProperties?.terminalId || null,
      posSyncStatus: 'PENDING_POS_TENDER',
      lastSyncedAt: new Date(),
    };
    order.posEvents.push({
      eventId: `prepare-${order._id}-${Date.now()}`,
      type: 'PREPARED_FOR_POS',
      terminalId,
      receivedAt: new Date(),
      rawDigest: bridgeId || 'sunset-pulse-kds',
    });

    await order.save();

    return successResponse({
      orderId: order._id,
      pickupCode: order.pickupCode,
      paymentState: order.paymentState,
      bridgeTargetIp: process.env.VERIFONE_COMMANDER_IP || '192.168.31.11',
      amount: order.totalAmount,
      items: order.items,
    });
  } catch (error: any) {
    console.error('[VERIFONE_PREPARE_FAILURE]:', error);
    return errorResponse('Failed to prepare order for Verifone tender.', 500, error.message);
  }
}
