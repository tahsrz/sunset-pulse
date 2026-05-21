import { NextRequest } from 'next/server';
import Stripe from 'stripe';
import { getSessionUser } from '@/lib/core/getSessionUser';
import { successResponse, errorResponse, unauthorizedResponse } from '@/lib/core/apiResponse';

// Initialize Stripe with the latest stable API version for typed safety
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-12-18.acacia' as any, // Standard stable version
});

export async function POST(req: NextRequest) {
  try {
    // Authenticate the user session
    const sessionUser = await getSessionUser();

    if (!sessionUser || !sessionUser.userId) {
      return unauthorizedResponse('Authentication required for subscription services.');
    }

    //  Validate environment configuration
    const domain = process.env.NEXT_PUBLIC_DOMAIN;
    if (!domain) {
      throw new Error('NEXT_PUBLIC_DOMAIN is not defined.');
    }

    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY is missing from environment variables.');
    }

    //  Create the Stripe Checkout Session
    const checkoutSession = await stripe.checkout.sessions.create({
      payment_method_types: ['card'], // Ensure PayPal is enabled in Stripe Dashboard before adding 'paypal'
      customer_email: sessionUser.user.email,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Sunset Pulse Site Subscription',
              description: 'Personal sunsetpulse.app subdomain, Jamie-powered site customization, and priority real-estate intelligence tools.',
            },
            unit_amount: 5996, // $59.96
            recurring: {
              interval: 'month' as Stripe.Checkout.SessionCreateParams.LineItem.PriceData.Recurring.Interval,
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

  } catch (err: any) {
    console.error('Stripe Session Error:', err);
    
    const errorMessage = err instanceof Stripe.errors.StripeError 
      ? err.message 
      : 'Failed to initialize subscription checkout.';

    return errorResponse(errorMessage, 500, err.message);
  }
}
