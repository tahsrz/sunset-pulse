import { NextRequest } from 'next/server';
import Stripe from 'stripe';
import { getSessionUser } from '@/lib/core/getSessionUser';
import { successResponse, errorResponse, unauthorizedResponse } from '@/lib/core/apiResponse';
import { normalizeAgentId } from '@/lib/sites/agentConfig';
import type { AgentLaunchKit } from '@/lib/sites/launchKit';
import { getStripeClient } from '@/lib/stripeClient';

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

    const checkoutInput = await readOptionalCheckoutInput(req);
    const agentId = normalizeAgentId(checkoutInput.agentId);
    const ownerName = normalizeMetadataString(checkoutInput.ownerName);
    const subscriptionTier = normalizeSubscriptionTier(checkoutInput.subscriptionTier) || 'site';
    const siteMetadata = compactMetadata({
      productType: 'agent_site',
      userId: sessionUser.userId,
      agentId,
      ownerName,
      subscriptionTier,
    });

    //  Create the Stripe Checkout Session
    const checkoutSession = await getStripeClient().checkout.sessions.create({
      client_reference_id: sessionUser.userId,
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
        trial_period_days: 90,
        metadata: siteMetadata,
      },
      // {CHECKOUT_SESSION_ID} is a Stripe template string replaced upon redirect
      success_url: `${domain}/onboarding/site?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${domain}/premium?canceled=true`,
      metadata: siteMetadata,
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

type CheckoutInput = {
  agentId?: string | null;
  ownerName?: string | null;
  subscriptionTier?: string | null;
};

async function readOptionalCheckoutInput(req: NextRequest): Promise<CheckoutInput> {
  const contentType = req.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) return {};

  try {
    return await req.json();
  } catch {
    return {};
  }
}

function normalizeSubscriptionTier(value: unknown): AgentLaunchKit['subscriptionTier'] | null {
  if (value === 'starter' || value === 'site' || value === 'atlas' || value === 'enterprise') {
    return value;
  }

  return null;
}

function normalizeMetadataString(value: unknown) {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, 120);
}

function compactMetadata(values: Record<string, string | null | undefined>) {
  return Object.fromEntries(
    Object.entries(values)
      .filter((entry): entry is [string, string] => typeof entry[1] === 'string' && entry[1].length > 0),
  );
}
