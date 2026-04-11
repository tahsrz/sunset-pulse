import Stripe from 'stripe';
import { getSessionUser } from '@/lib/core/getSessionUser';
import { successResponse, errorResponse, unauthorizedResponse } from '@/lib/core/apiResponse';

// Initialize Stripe with the latest stable API version for typed safety
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-11-13', 
});

export async function POST(req) {
  try {
    // 1. Authenticate the user session
    const sessionUser = await getSessionUser();

    if (!sessionUser || !sessionUser.userId) {
      return unauthorizedResponse('Authentication required for subscription services.');
    }

    // 2. Validate environment configuration
    const domain = process.env.NEXT_PUBLIC_DOMAIN;
    if (!domain) {
      throw new Error('NEXT_PUBLIC_DOMAIN is not defined.');
    }

    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY is missing from environment variables.');
    }

    // 3. Create the Stripe Checkout Session
    const checkoutSession = await stripe.checkout.sessions.create({
      payment_method_types: ['card'], // Ensure PayPal is enabled in Stripe Dashboard before adding 'paypal'
      customer_email: sessionUser.user.email,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Sunset Premium Subscription',
              description: 'Access to Advanced Platform Features, Abidan Core, and Priority Data Insights.',
            },
            unit_amount: 5996, // $59.96
            recurring: {
              interval: 'month',
            },
          },
          quantity: 1,
        },
      ],
      mode: 'subscription',
      subscription_data: {
        trial_period_days: 30,
      },
      // {CHECKOUT_SESSION_ID} is a Stripe template string replaced upon redirect
      success_url: `${domain}/dashboard?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${domain}/premium?canceled=true`,
      metadata: {
        userId: sessionUser.userId, // REQUIRED for Webhook to grant access in Supabase
      },
      automatic_tax: { enabled: true },
      customer_update: { address: 'auto' },
    });

    return successResponse({ 
      sessionId: checkoutSession.id, 
      url: checkoutSession.url 
    });

  } catch (err) {
    console.error('Stripe Session Error:', err);
    
    const errorMessage = err instanceof Stripe.errors.StripeError 
      ? err.message 
      : 'Failed to initialize subscription checkout.';

    return errorResponse(errorMessage, 500, err.message);
  }
}