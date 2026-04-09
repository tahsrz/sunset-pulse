import Stripe from 'stripe';
import { getSessionUser } from '@/lib/core/getSessionUser';
import { successResponse, errorResponse, unauthorizedResponse } from '@/lib/core/apiResponse';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');

export async function POST() {
  try {
    const sessionUser = await getSessionUser();

    if (!sessionUser || !sessionUser.userId) {
      return unauthorizedResponse('Authentication required for subscription services.');
    }

    const checkoutSession = await stripe.checkout.sessions.create({
      payment_method_types: ['card', 'paypal'],
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
      success_url: `${process.env.NEXT_PUBLIC_DOMAIN}/?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_DOMAIN}/premium?canceled=true`,
      metadata: {
        userId: sessionUser.userId,
      },
      payment_method_options: {
        card: {
          request_three_d_secure: 'any',
        },
      },
    });

    return successResponse({ sessionId: checkoutSession.id, url: checkoutSession.url });
  } catch (err: any) {
    console.error('Stripe Session Error:', err);
    return errorResponse('Failed to initialize subscription checkout.', 500, err.message);
  }
}
