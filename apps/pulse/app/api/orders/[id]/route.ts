export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import connectDB from '@/lib/core/database';
import Order from '@/models/Order';
import { successResponse, errorResponse } from '@/lib/core/apiResponse';
import { prisma } from '@calcom/prisma';

/**
 * GET /api/orders/[id]
 * Retrieves the details of a single order decorated with the active Grill Employee name from Cal.com
 */
export const GET = async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    await connectDB();
    const { id } = await params;
    const order = await Order.findById(id);

    if (!order) {
      return errorResponse('Order not found.', 404);
    }

    // Determine the scheduled Grill Employee at order's planned pickup time, fallback to order creation time, or fallback to now
    const targetTime = order.scheduledTime 
      ? new Date(order.scheduledTime) 
      : (order.createdAt ? new Date(order.createdAt) : new Date());

    let activeGrillBooking = await prisma.booking.findFirst({
      where: {
        startTime: { lte: targetTime },
        endTime: { gte: targetTime },
        eventType: {
          slug: 'grill-shift',
        },
        status: 'ACCEPTED',
      },
      select: {
        user: {
          select: {
            name: true,
            email: true,
            username: true,
          },
        },
      },
    });

    if (!activeGrillBooking) {
      const now = new Date();
      activeGrillBooking = await prisma.booking.findFirst({
        where: {
          startTime: { lte: now },
          endTime: { gte: now },
          eventType: {
            slug: 'grill-shift',
          },
          status: 'ACCEPTED',
        },
        select: {
          user: {
            select: {
              name: true,
              email: true,
              username: true,
            },
          },
        },
      });
    }

    const grillEmployee = activeGrillBooking?.user?.name || 'Shaikh';

    return successResponse({ order, grillEmployee });
  } catch (error: any) {
    console.error('[ORDER_GET_FAILURE]:', error);
    return errorResponse('Failed to retrieve order details.', 500, error.message);
  }
};

/**
 * PATCH /api/orders/[id]
 * Updates the status of a specific grill order
 */
export const PATCH = async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    await connectDB();
    const { id } = await params;
    const { status, action } = await request.json();

    if (status && !['pending', 'cooking', 'completed', 'cancelled'].includes(status)) {
      return errorResponse('Invalid status value.', 400);
    }

    const updates: any = {};
    if (status) updates.status = status;
    if (action === 'verify-id') updates.idVerifiedAt = new Date();
    if (action === 'release') {
      const existingOrder = await Order.findById(id);
      if (!existingOrder) {
        return errorResponse('Order not found.', 404);
      }

      const paymentState = existingOrder.paymentState || (existingOrder.isPaid ? 'PAID_STRIPE' : 'UNPAID');
      if (!['PAID_STRIPE', 'PAID_POS'].includes(paymentState)) {
        return errorResponse('Order cannot be released until payment is confirmed.', 409);
      }

      updates.releasedAt = new Date();
    }

    if (!status && !action) {
      return errorResponse('Status or action is required.', 400);
    }

    const order = await Order.findByIdAndUpdate(
      id,
      updates,
      { new: true }
    );

    if (!order) {
      return errorResponse('Order not found.', 404);
    }

    return successResponse({ message: action ? `Order action completed: ${action}.` : `Order status updated to ${status}.`, order });
  } catch (error: any) {
    console.error('[ORDER_PATCH_FAILURE]:', error);
    return errorResponse('Failed to update order status.', 500, error.message);
  }
};

/**
 * DELETE /api/orders/[id]
 * Removes an order from the system (Purge protocol)
 */
export const DELETE = async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    await connectDB();
    const { id } = await params;
    const order = await Order.findByIdAndDelete(id);

    if (!order) {
      return errorResponse('Order not found.', 404);
    }

    return successResponse({ message: 'Order purged from grid.' });
  } catch (error: any) {
    console.error('[ORDER_DELETE_FAILURE]:', error);
    return errorResponse('Failed to purge order.', 500, error.message);
  }
};
