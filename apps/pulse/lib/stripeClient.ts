import Stripe from 'stripe';

let stripeClient: Stripe | null = null;

export function getStripeClient() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is missing from environment variables.');
  }

  if (!stripeClient) {
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-12-18.acacia' as any,
    });
  }

  return stripeClient;
}
