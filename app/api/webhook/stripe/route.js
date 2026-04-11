import Stripe from 'stripe';
import { headers } from 'next/headers';
import connectDB from '@/lib/core/database';
import User from '@/models/User';
import { successResponse, errorResponse } from '@/lib/core/apiResponse';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(req) {
  const body = await req.text();
  const signature = headers().get('stripe-signature');

  let event;

  try {
    if (!signature || !webhookSecret) {
      console.error('Webhook: Missing signature or secret');
      return errorResponse('Webhook Error: Missing signature or secret', 400);
    }
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error(`Webhook Error: ${err.message}`);
    return errorResponse(`Webhook Error: ${err.message}`, 400);
  }

  const session = event.data.object;

  // Handle successful checkout
  if (event.type === 'checkout.session.completed') {
    await connectDB();
    const userId = session.metadata.userId;

    if (userId) {
      await User.findByIdAndUpdate(userId, {
        subscriptionExpires: new Date(Date.now() + 31 * 24 * 60 * 60 * 1000), // Approx 1 month
      });
      console.log(`✅ [STRIPE_WEBHOOK] User ${userId} upgraded to Premium.`);
    }
  }

  // Handle subscription deletion/cancellation
  if (event.type === 'customer.subscription.deleted') {
    await connectDB();
    const subscription = event.data.object;
    // In a production app, you'd find the user by Stripe customer ID
    // For now, we'll assume we need to handle this manually or via more complex mapping
    console.log(`📡 [STRIPE_WEBHOOK] Subscription ${subscription.id} deleted.`);
  }

  return successResponse({ received: true });
}
