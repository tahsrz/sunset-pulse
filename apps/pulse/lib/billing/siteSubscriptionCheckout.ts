import Stripe from 'stripe';
import type { AgentLaunchKit } from '@/lib/sites/launchKit';

export const SITE_SUBSCRIPTION_TRIAL_DAYS = 90;

export type SiteCheckoutBillingSnapshot = {
  checkoutPaymentStatus: Stripe.Checkout.Session.PaymentStatus | 'unknown';
  stripeSubscriptionId: string;
  stripeSubscriptionStatus: string;
  billingStatus: AgentLaunchKit['billingProfile']['billingStatus'] | null;
  trialEndsAt: string;
  trialVerified: boolean;
  trialDaysExpected: number;
  trialDaysObserved: number | null;
};

export function getSiteCheckoutBillingSnapshot(session: Stripe.Checkout.Session): SiteCheckoutBillingSnapshot {
  const subscription = expandedSubscription(session.subscription);
  const trialEndsAt = stripeTimestampToIso(subscription?.trial_end);
  const trialDaysObserved = estimateTrialDays(session.created, subscription?.trial_end);
  const billingStatus = mapStripeSubscriptionStatus(subscription?.status);

  return {
    checkoutPaymentStatus: session.payment_status || 'unknown',
    stripeSubscriptionId: stripeId(subscription) || stripeId(session.subscription),
    stripeSubscriptionStatus: subscription?.status || '',
    billingStatus,
    trialEndsAt,
    trialVerified: billingStatus === 'trialing'
      && Boolean(trialEndsAt)
      && trialDaysObserved !== null
      && Math.abs(trialDaysObserved - SITE_SUBSCRIPTION_TRIAL_DAYS) <= 1,
    trialDaysExpected: SITE_SUBSCRIPTION_TRIAL_DAYS,
    trialDaysObserved,
  };
}

export function acceptsSiteCheckoutPaymentStatus(session: Stripe.Checkout.Session) {
  return session.payment_status === 'paid' || session.payment_status === 'no_payment_required';
}

export function stripeId(value: string | { id?: string } | null | undefined) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  return value.id || '';
}

function expandedSubscription(value: Stripe.Checkout.Session['subscription'] | null | undefined) {
  if (!value || typeof value === 'string') return null;
  if ('deleted' in value && value.deleted) return null;
  return value as Stripe.Subscription;
}

function mapStripeSubscriptionStatus(status?: Stripe.Subscription.Status | string | null) {
  if (status === 'trialing') return 'trialing';
  if (status === 'active') return 'active';
  if (status === 'past_due') return 'past_due';
  if (status === 'canceled') return 'canceled';
  if (status === 'unpaid') return 'unpaid';
  if (status === 'incomplete') return 'incomplete';
  if (status === 'incomplete_expired' || status === 'paused') return 'incomplete';
  return null;
}

function stripeTimestampToIso(value?: number | null) {
  if (!value) return '';
  const date = new Date(value * 1000);
  return Number.isFinite(date.getTime()) ? date.toISOString() : '';
}

function estimateTrialDays(startSeconds?: number | null, endSeconds?: number | null) {
  if (!startSeconds || !endSeconds || endSeconds <= startSeconds) return null;
  return Math.round((endSeconds - startSeconds) / 86_400);
}
