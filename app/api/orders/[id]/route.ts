export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import connectDB from '@/lib/core/database';
import Order from '@/models/Order';
import { successResponse, errorResponse } from '@/lib/core/apiResponse';

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
