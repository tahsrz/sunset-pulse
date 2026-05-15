export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import Stripe from 'stripe';
import { headers } from 'next/headers';
import connectDB from '@/lib/core/database';
import User from '@/models/User';
import Order from '@/models/Order';
import { successResponse, errorResponse } from '@/lib/core/apiResponse';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = (await headers()).get('stripe-signature');

  let event: Stripe.Event;

  try {
    if (!signature || !webhookSecret) {
      console.error('Webhook: Missing signature or secret');
      return errorResponse('Webhook Error: Missing signature or secret', 400);
    }
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: any) {
    console.error(`Webhook Error: ${err.message}`);
    return errorResponse(`Webhook Error: ${err.message}`, 400);
  }

  const session = event.data.object as Stripe.Checkout.Session;

  // Handle successful checkout
  if (event.type === 'checkout.session.completed') {
    await connectDB();
    const customerEmail = session.customer_email;
    const metadata = session.metadata;

    // 1. Handle Subscription Upgrades
    if (!metadata?.orderType && customerEmail) {
      await User.findOneAndUpdate({ email: customerEmail }, {
        subscriptionExpires: new Date(Date.now() + 31 * 24 * 60 * 60 * 1000), //  1 month
      });
      console.log(`✅ [STRIPE_WEBHOOK] User ${customerEmail} upgraded to Premium.`);
    }

    // 2. Handle Grill Food Orders
    if (metadata?.orderType === 'grill_food' && metadata?.orderId) {
      await Order.findByIdAndUpdate(metadata.orderId, {
        isPaid: true,
        paymentSessionId: session.id
      });
      console.log(`🍔 [STRIPE_WEBHOOK] Order ${metadata.orderId} marked as PAID.`);
    }
  }

  // Handle subscription deletion/cancellation
  if (event.type === 'customer.subscription.deleted') {
    await connectDB();
    const subscription = event.data.object as Stripe.Subscription;
    console.log(`📡 [STRIPE_WEBHOOK] Subscription ${subscription.id} deleted.`);
  }

  return successResponse({ received: true });
}
