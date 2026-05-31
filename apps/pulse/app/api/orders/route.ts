export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import connectDB from '@/lib/core/database';
import Order from '@/models/Order';
import { getSessionUser } from '@/lib/core/getSessionUser';
import { successResponse, errorResponse } from '@/lib/core/apiResponse';
import { prisma } from '@calcom/prisma';
import crypto from 'node:crypto';

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
    const { items, totalAmount, scheduledTime, customerName, isPaid, paymentSessionId, paymentReference } = await request.json();
    const sessionUser = await getSessionUser();

    const orderData: any = {
      items,
      totalAmount,
      status: 'pending',
      isPaid: Boolean(isPaid),
      paymentState: isPaid ? 'PAID_STRIPE' : 'UNPAID',
      pickupCode: crypto.randomInt(100000, 999999).toString(),
    };

    if (customerName) orderData.customerName = customerName;
    if (paymentSessionId) orderData.paymentSessionId = paymentSessionId;
    if (paymentReference) orderData.paymentReference = paymentReference;

    if (sessionUser && sessionUser.userId) {
      orderData.user = sessionUser.userId;
    }

    if (scheduledTime) {
      orderData.scheduledTime = new Date(scheduledTime);
    }

    const newOrder = new Order(orderData);
    await newOrder.save();

    // Synchronize scheduled order with Cal.com PostgreSQL
    if (scheduledTime) {
      try {
        const orderIdShort = newOrder._id.toString().slice(-6).toUpperCase();
        const startTime = new Date(scheduledTime);
        const endTime = new Date(startTime.getTime() + 15 * 60 * 1000); // 15-minute slot

        const bookingUid = crypto.randomUUID();
        await prisma.booking.create({
          data: {
            uid: bookingUid,
            title: `🍔 Grill Order Pickup - #${orderIdShort}`,
            description: `Scheduled pickup for customer order #${orderIdShort}. Items: ${items.map((i: any) => `${i.quantity}x ${i.name}`).join(', ')}.`,
            startTime,
            endTime,
            status: 'ACCEPTED',
            userPrimaryEmail: sessionUser?.user?.email || 'anonymous-customer@sunsetgrill.local',
          },
        });
        console.log(`[CALCOM_SYNC] Order #${orderIdShort} successfully synchronized into Cal.com PostgreSQL.`);
      } catch (prismaError: any) {
        console.error('[CALCOM_SYNC_WARNING] Failed to synchronize booking with Cal.com PostgreSQL:', prismaError.message);
      }
    }

    return successResponse({ message: 'Order processed successfully.', id: newOrder._id }, 201);
  } catch (error: any) {
    console.error('[ORDERS_POST_FAILURE]:', error);
    return errorResponse('Failed to process order.', 500, error.message);
  }
};
