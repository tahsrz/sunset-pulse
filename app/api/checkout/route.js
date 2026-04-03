import Stripe from 'stripe';
import { getSessionUser } from '@/lib/core/getSessionUser';
import { NextResponse } from 'next/server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');

export async function POST() {
  try {
    const sessionUser = await getSessionUser();

    if (!sessionUser || !sessionUser.userId) {
      return new NextResponse('Unauthorized', { status: 401 });
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
              description: 'Access to Grid Manipulation, Abidan Core, and Priority Intel.',
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
      // Ensure Apple/Google Pay are active if enabled in dashboard
      payment_method_options: {
        card: {
          request_three_d_secure: 'any',
        },
      },
    });

    return NextResponse.json({ sessionId: checkoutSession.id, url: checkoutSession.url });
  } catch (err) {
    console.error('Stripe Session Error:', err);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
