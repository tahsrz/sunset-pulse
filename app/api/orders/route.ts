export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import connectDB from '@/lib/core/database';
import Order from '@/models/Order';
import { getSessionUser } from '@/lib/core/getSessionUser';
import { successResponse, errorResponse } from '@/lib/core/apiResponse';

/**
 * GET /api/orders
 * Retrieves active grill orders (Pending and Cooking)
 */
export const GET = async () => {
  try {
    await connectDB();
    
    // Fetch orders that are not 'completed' or 'cancelled'
    const activeOrders = await Order.find({ 
      status: { $in: ['pending', 'cooking'] } 
    }).sort({ createdAt: 1 }); // Oldest first (FIFO)

    return successResponse(activeOrders);
  } catch (error: any) {
    console.error('[ORDERS_GET_FAILURE]:', error);
    return errorResponse('Failed to retrieve active orders.', 500, error.message);
  }
};

/**
 * POST /api/orders
 * new grill order entry
 */
export const POST = async (request: NextRequest) => {
  try {
    await connectDB();
    const { items, totalAmount } = await request.json();
    const sessionUser = await getSessionUser();

    const orderData: any = {
      items,
      totalAmount,
      status: 'pending'
    };

    if (sessionUser && sessionUser.userId) {
      orderData.user = sessionUser.userId;
    }

    const newOrder = new Order(orderData);
    await newOrder.save();

    return successResponse({ message: 'Order processed successfully.', id: newOrder._id }, 201);
  } catch (error: any) {
    console.error('[ORDERS_POST_FAILURE]:', error);
    return errorResponse('Failed to process order.', 500, error.message);
  }
};
