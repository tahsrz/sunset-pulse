import Stripe from 'stripe';
import { getStripeClient } from '@/lib/stripeClient';
import { normalizeLaunchKit, type AgentLaunchKit, type AgentLaunchKitResponse } from '@/lib/sites/launchKit';
import {
  updateProvisionedAgentSiteBilling,
} from '@/lib/sites/siteProvisioning';

export type SiteBillingRecheckResult = AgentLaunchKitResponse & {
  savedStores: string[];
  stripeSubscriptionId: string;
  stripeStatus: string;
  selectedBy: 'stored_subscription' | 'customer_subscription';
};

export async function recheckSiteBillingFromStripe(input: {
  kit: AgentLaunchKit;
  source?: string;
}): Promise<SiteBillingRecheckResult> {
  const kit = normalizeLaunchKit(input.kit);
  const subscription = await findStripeSubscriptionForKit(kit);
  const billingStatus = normalizeStripeSubscriptionStatus(subscription.status);

  if (!billingStatus) {
    throw new Error(`Stripe subscription status ${subscription.status || 'unknown'} is not supported for site billing restore.`);
  }

  const updated = await updateProvisionedAgentSiteBilling({
    agentId: kit.agentId,
    userId: kit.ownerId || kit.billingProfile.userId || '',
    email: kit.agentProfile.email || kit.integrationProfile.leadEmail || '',
    subscriptionTier: kit.subscriptionTier,
    stripeCustomerId: stripeId(subscription.customer) || kit.billingProfile.stripeCustomerId || '',
    stripeSubscriptionId: subscription.id,
    billingStatus,
    trialEndsAt: unixSecondsToIso(subscription.trial_end),
    source: input.source || 'admin-billing-recheck',
  });

  if (!updated) {
    throw new Error('Agent site billing profile could not be updated from Stripe.');
  }

  return {
    ...updated,
    stripeSubscriptionId: subscription.id,
    stripeStatus: subscription.status || 'unknown',
    selectedBy: subscription.id === kit.billingProfile.stripeSubscriptionId
      ? 'stored_subscription'
      : 'customer_subscription',
  };
}

async function findStripeSubscriptionForKit(kit: AgentLaunchKit) {
  const stripe = getStripeClient();
  const storedSubscriptionId = kit.billingProfile.stripeSubscriptionId;

  if (storedSubscriptionId) {
    const subscription = await stripe.subscriptions.retrieve(storedSubscriptionId);
    if (!isDeletedSubscription(subscription)) return subscription;
  }

  const customerId = kit.billingProfile.stripeCustomerId;
  if (!customerId) {
    throw new Error('This site does not have a Stripe subscription or customer to recheck.');
  }

  const subscriptions = await stripe.subscriptions.list({
    customer: customerId,
    status: 'all',
    limit: 10,
  });
  const candidate = chooseRestorableSubscription(subscriptions.data);
  if (!candidate) {
    throw new Error('No Stripe subscription was found for this site customer.');
  }

  return candidate;
}

function chooseRestorableSubscription(subscriptions: Stripe.Subscription[]) {
  return subscriptions.find((subscription) => subscription.status === 'active' || subscription.status === 'trialing')
    || subscriptions.find((subscription) => subscription.status === 'past_due')
    || subscriptions.find((subscription) => subscription.status === 'unpaid' || subscription.status === 'incomplete')
    || subscriptions.find((subscription) => subscription.status === 'canceled')
    || subscriptions[0]
    || null;
}

function normalizeStripeSubscriptionStatus(status: Stripe.Subscription.Status | string | null | undefined): AgentLaunchKit['billingProfile']['billingStatus'] | null {
  if (status === 'trialing' || status === 'active' || status === 'past_due' || status === 'canceled' || status === 'unpaid' || status === 'incomplete') {
    return status;
  }

  if (status === 'incomplete_expired' || status === 'paused') {
    return 'incomplete';
  }

  return null;
}

function isDeletedSubscription(subscription: Stripe.Subscription | { deleted?: boolean }) {
  return Boolean((subscription as { deleted?: boolean }).deleted);
}

function stripeId(value: string | Stripe.Customer | Stripe.DeletedCustomer | null) {
  if (typeof value === 'string') return value;
  return typeof value?.id === 'string' ? value.id : '';
}

function unixSecondsToIso(value: number | null | undefined) {
  if (!value) return '';
  const date = new Date(value * 1000);
  return Number.isFinite(date.getTime()) ? date.toISOString() : '';
}
