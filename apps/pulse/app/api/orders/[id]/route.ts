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
  { params }: { params: { id: string } }
) => {
  try {
    await connectDB();
    const order = await Order.findById(params.id);

    if (!order) {
      return errorResponse('Order not found.', 404);
    }

    // Determine the scheduled Grill Employee at order creation time or fallback to now
    const targetTime = order.createdAt ? new Date(order.createdAt) : new Date();

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
  { params }: { params: { id: string } }
) => {
  try {
    await connectDB();
    const { status } = await request.json();

    if (!['pending', 'cooking', 'completed', 'cancelled'].includes(status)) {
      return errorResponse('Invalid status value.', 400);
    }

    const order = await Order.findByIdAndUpdate(
      params.id,
      { status },
      { new: true }
    );

    if (!order) {
      return errorResponse('Order not found.', 404);
    }

    return successResponse({ message: `Order status updated to ${status}.`, order });
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
  { params }: { params: { id: string } }
) => {
  try {
    await connectDB();
    const order = await Order.findByIdAndDelete(params.id);

    if (!order) {
      return errorResponse('Order not found.', 404);
    }

    return successResponse({ message: 'Order purged from grid.' });
  } catch (error: any) {
    console.error('[ORDER_DELETE_FAILURE]:', error);
    return errorResponse('Failed to purge order.', 500, error.message);
  }
};
