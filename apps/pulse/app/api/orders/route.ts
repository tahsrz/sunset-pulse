export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import connectDB from '@/lib/core/database';
import Order from '@/models/Order';
import { getSessionUser } from '@/lib/core/getSessionUser';
import { successResponse, errorResponse } from '@/lib/core/apiResponse';
import { prisma } from '@calcom/prisma';
import crypto from 'node:crypto';
import { requireKdsAccess } from '@/lib/kds/access';
import { calculateEstimatedReadyAt, calculateEstimatedWaitMinutes } from '@/lib/grill/waitTime';
import { calculatePricingWithDeal } from '@/lib/grill/deals';
import { resolveCartItemsFromMenu } from '@/lib/grill/serverCart';
import { validateAndFetchCoupon, getAutoFirstOrderDiscount } from '@/lib/grill/coupons';

/**
 * GET /api/orders
 * Retrieves active grill orders (Pending and Cooking)
 */
export const GET = async (request: NextRequest) => {
  try {
    const access = await requireKdsAccess(request);
    if (access instanceof Response) return access;

    await connectDB();
    
    // Fetch orders that are not 'completed' or 'cancelled'
    const activeOrders = await Order.find({
      status: { $in: ['pending', 'cooking', 'ready'] },
      $or: [
        { isPaid: true },
        { paymentState: { $in: ['PAID_STRIPE', 'PAID_POS'] } },
      ],
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
    const { items, couponCode, scheduledTime, customerName, checkoutIntent } = await request.json();
    if (checkoutIntent !== 'stripe') {
      return errorResponse('Orders must be created through Stripe checkout.', 402);
    }

    await connectDB();
    const sessionUser = await getSessionUser();
    const resolvedItems = await resolveCartItemsFromMenu(items);
    
    // Determine the deal to apply
    let validatedDeal = null;
    if (couponCode) {
      validatedDeal = await validateAndFetchCoupon(couponCode, sessionUser?.userId);
    } else if (sessionUser?.userId) {
      // Auto-apply first order discount if applicable
      validatedDeal = await getAutoFirstOrderDiscount(sessionUser.userId);
    }

    const pricing = calculatePricingWithDeal(resolvedItems, validatedDeal);

    const waitStartTime = scheduledTime ? new Date(scheduledTime) : new Date();
    const estimatedWaitMinutes = calculateEstimatedWaitMinutes(resolvedItems);
    const estimatedReadyAt = calculateEstimatedReadyAt(waitStartTime, resolvedItems);

    const orderData: any = {
      items: resolvedItems,
      subtotalAmount: pricing.subtotalAmount,
      discountAmount: pricing.discountAmount,
      totalAmount: pricing.totalAmount,
      coupon: pricing.appliedDeal,
      status: 'pending',
      isPaid: false,
      paymentState: 'UNPAID',
      pickupCode: crypto.randomInt(100000, 999999).toString(),
      estimatedWaitMinutes,
      estimatedReadyAt,
    };

    if (customerName) orderData.customerName = customerName;

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
        const endTime = new Date(startTime.getTime() + estimatedWaitMinutes * 60 * 1000);

        const bookingUid = crypto.randomUUID();
        await prisma.booking.create({
          data: {
            uid: bookingUid,
            title: `🍔 Grill Order Pickup - #${orderIdShort}`,
            description: `Scheduled pickup for customer order #${orderIdShort}. Estimated wait: ${estimatedWaitMinutes} minutes. Items: ${items.map((i: any) => `${i.quantity}x ${i.name}`).join(', ')}.`,
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
