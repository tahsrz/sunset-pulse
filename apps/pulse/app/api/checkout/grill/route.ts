import { NextRequest } from 'next/server';
import Stripe from 'stripe';
import { getSessionUser } from '@/lib/core/getSessionUser';
import { successResponse, errorResponse } from '@/lib/core/apiResponse';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-12-18.acacia' as any,
});

export async function POST(req: NextRequest) {
  try {
    const sessionUser = await getSessionUser();
    const { items, totalAmount, orderId } = await req.json();

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

    const checkoutSession = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      customer_email: sessionUser?.user?.email,
      line_items: lineItems,
      mode: 'payment',
      success_url: `${domain}/grill?success=true&session_id={CHECKOUT_SESSION_ID}&order_id=${orderId}`,
      cancel_url: `${domain}/cart?canceled=true`,
      metadata: {
        userId: sessionUser?.userId || 'guest',
        orderType: 'grill_food',
        orderId: orderId, // Crucial for webhook to find the order
        items: JSON.stringify(items.map((i: any) => i.name)),
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
