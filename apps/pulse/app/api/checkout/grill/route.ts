import { NextRequest } from 'next/server';
import Stripe from 'stripe';
import connectDB from '@/lib/core/database';
import { getSessionUser } from '@/lib/core/getSessionUser';
import { successResponse, errorResponse } from '@/lib/core/apiResponse';
import Order from '@/models/Order';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-12-18.acacia' as any,
});

export async function POST(req: NextRequest) {
  try {
    const sessionUser = await getSessionUser();
    const { orderId } = await req.json();
    if (!orderId) {
      return errorResponse('orderId is required for Stripe checkout.', 400);
    }

    await connectDB();
    const order = await Order.findById(orderId).lean();
    if (!order) {
      return errorResponse('Order not found.', 404);
    }

    if (order.isPaid || ['PAID_STRIPE', 'PAID_POS'].includes(order.paymentState)) {
      return errorResponse('Order is already paid.', 409);
    }

    const items = order.items || [];
    if (!Array.isArray(items) || items.length === 0) {
      return errorResponse('Order has no checkout items.', 400);
    }

    const domain = process.env.NEXT_PUBLIC_DOMAIN;
    if (!domain) throw new Error('NEXT_PUBLIC_DOMAIN is not defined.');

    // Create line items for Stripe
    const lineItems = items.map((item: any) => ({
      price_data: {
        currency: 'usd',
        product_data: {
          name: item.name,
          description: 'Sunset Grill Item',
        },
        unit_amount: Math.round(item.price * 100), // Stripe uses cents
      },
      quantity: item.quantity,
    }));

    const discounts = [];
    const discountAmount = Number(order.discountAmount || 0);
    if (order.coupon?.code && discountAmount > 0) {
      const coupon = await stripe.coupons.create({
        amount_off: Math.round(discountAmount * 100),
        currency: 'usd',
        duration: 'once',
        name: order.coupon.label || order.coupon.code,
        metadata: {
          code: order.coupon.code,
          orderId,
        },
      });

      discounts.push({ coupon: coupon.id });
    }

    const checkoutSession = await stripe.checkout.sessions.create({
      customer_email: sessionUser?.user?.email,
      line_items: lineItems,
      discounts,
      mode: 'payment',
      success_url: `${domain}/grill/tracker/${orderId}?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${domain}/cart?canceled=true`,
      metadata: {
        userId: sessionUser?.userId || 'guest',
        orderType: 'grill_food',
        orderId: orderId, // Crucial for webhook to find the order
        items: JSON.stringify(items.map((i: any) => i.name)),
        couponCode: order.coupon?.code || '',
        discountAmount: discountAmount.toFixed(2),
        totalAmount: Number(order.totalAmount || 0).toFixed(2),
      },
    });

    return successResponse({ 
      sessionId: checkoutSession.id, 
      url: checkoutSession.url 
    });

  } catch (err: any) {
    console.error('Grill Stripe Session Error:', err);
    return errorResponse(err.message, 500);
  }
}
