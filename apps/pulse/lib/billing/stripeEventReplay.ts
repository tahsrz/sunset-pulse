import Stripe from 'stripe';
import { getStripeClient } from '@/lib/stripeClient';
import { getSiteCheckoutBillingSnapshot, stripeId } from '@/lib/billing/siteSubscriptionCheckout';
import type { AgentLaunchKit } from '@/lib/sites/launchKit';
import {
  provisionPaidAgentSite,
  suspendProvisionedAgentSite,
  updateProvisionedAgentSiteBilling,
} from '@/lib/sites/siteProvisioning';

export type StripeReplayResult = {
  eventId: string;
  eventType: string;
  action: 'checkout_replayed' | 'subscription_reconciled' | 'subscription_suspended' | 'invoice_subscription_reconciled';
  objectId: string;
  stripeSubscriptionId: string;
  stripeStatus: string;
  kit: unknown;
  savedStores: string[];
};

export async function replayStripeSiteEvent(input: {
  eventId: string;
  agentId?: string;
  source?: string;
}): Promise<StripeReplayResult> {
  const eventId = input.eventId.trim();
  if (!eventId.startsWith('evt_')) {
    throw new Error('A valid Stripe event id is required.');
  }

  const event = await getStripeClient().events.retrieve(eventId);
  const source = input.source || 'admin-stripe-event-replay';

  if (event.type === 'checkout.session.completed') {
    return replayCheckoutSession(event, source, input.agentId);
  }

  if (event.type === 'customer.subscription.updated') {
    return reconcileSubscriptionEvent(event, source, input.agentId);
  }

  if (event.type === 'customer.subscription.deleted') {
    return suspendSubscriptionEvent(event, source, input.agentId);
  }

  if (event.type === 'invoice.payment_failed') {
    return reconcileInvoiceSubscription(event, source, input.agentId);
  }

  throw new Error(`Stripe event ${event.type} is not supported for site replay yet.`);
}

async function replayCheckoutSession(event: Stripe.Event, source: string, agentId?: string): Promise<StripeReplayResult> {
  const rawSession = event.data.object as Stripe.Checkout.Session;
  const session = await getStripeClient().checkout.sessions.retrieve(rawSession.id, {
    expand: ['subscription'],
  });

  if (!isAgentSiteCheckout(session)) {
    throw new Error('Stripe checkout session is not an agent-site subscription.');
  }

  const billingSnapshot = getSiteCheckoutBillingSnapshot(session);
  const result = await provisionPaidAgentSite({
    agentId: agentId || session.metadata?.agentId,
    userId: session.metadata?.userId || session.client_reference_id,
    ownerName: session.metadata?.ownerName,
    email: session.customer_email || session.customer_details?.email,
    subscriptionTier: session.metadata?.subscriptionTier,
    stripeCustomerId: stripeId(session.customer),
    stripeSubscriptionId: billingSnapshot.stripeSubscriptionId || stripeId(session.subscription),
    stripeCheckoutSessionId: session.id,
    trialEndsAt: billingSnapshot.trialEndsAt,
    billingStatus: billingSnapshot.billingStatus || undefined,
    source,
  });

  return {
    eventId: event.id,
    eventType: event.type,
    action: 'checkout_replayed',
    objectId: session.id,
    stripeSubscriptionId: billingSnapshot.stripeSubscriptionId || stripeId(session.subscription),
    stripeStatus: billingSnapshot.stripeSubscriptionStatus || billingSnapshot.billingStatus || '',
    kit: result.kit,
    savedStores: result.savedStores,
  };
}

async function reconcileSubscriptionEvent(event: Stripe.Event, source: string, agentId?: string): Promise<StripeReplayResult> {
  const subscription = event.data.object as Stripe.Subscription;
  const result = await updateProvisionedAgentSiteBilling({
    ...subscriptionProvisioningInput(subscription, agentId),
    source,
  });

  if (!result) {
    throw new Error(`No provisioned agent site matched subscription ${subscription.id}.`);
  }

  return {
    eventId: event.id,
    eventType: event.type,
    action: 'subscription_reconciled',
    objectId: subscription.id,
    stripeSubscriptionId: subscription.id,
    stripeStatus: subscription.status,
    kit: result.kit,
    savedStores: result.savedStores,
  };
}

async function suspendSubscriptionEvent(event: Stripe.Event, source: string, agentId?: string): Promise<StripeReplayResult> {
  const subscription = event.data.object as Stripe.Subscription;
  const metadata = subscription.metadata || {};
  const result = await suspendProvisionedAgentSite({
    agentId: agentId || metadata.agentId,
    userId: metadata.userId,
    ownerName: metadata.ownerName,
    subscriptionTier: metadata.subscriptionTier,
    stripeCustomerId: stripeId(subscription.customer),
    stripeSubscriptionId: subscription.id,
    source,
  });

  if (!result) {
    throw new Error(`No provisioned agent site matched subscription ${subscription.id}.`);
  }

  return {
    eventId: event.id,
    eventType: event.type,
    action: 'subscription_suspended',
    objectId: subscription.id,
    stripeSubscriptionId: subscription.id,
    stripeStatus: 'canceled',
    kit: result.kit,
    savedStores: result.savedStores,
  };
}

async function reconcileInvoiceSubscription(event: Stripe.Event, source: string, agentId?: string): Promise<StripeReplayResult> {
  const invoice = event.data.object as Stripe.Invoice & {
    subscription?: string | { id?: string } | null;
    parent?: {
      subscription_details?: {
        subscription?: string | null;
      };
    } | null;
  };
  const subscriptionId = stripeId(invoice.subscription)
    || invoice.parent?.subscription_details?.subscription
    || '';

  if (!subscriptionId) {
    throw new Error('Invoice payment failure does not include a subscription id.');
  }

  const subscription = await getStripeClient().subscriptions.retrieve(subscriptionId);
  const result = await updateProvisionedAgentSiteBilling({
    ...subscriptionProvisioningInput(subscription, agentId),
    source,
  });

  if (!result) {
    throw new Error(`No provisioned agent site matched subscription ${subscription.id}.`);
  }

  return {
    eventId: event.id,
    eventType: event.type,
    action: 'invoice_subscription_reconciled',
    objectId: invoice.id || subscription.id,
    stripeSubscriptionId: subscription.id,
    stripeStatus: subscription.status,
    kit: result.kit,
    savedStores: result.savedStores,
  };
}

function subscriptionProvisioningInput(subscription: Stripe.Subscription, agentId?: string) {
  const metadata = subscription.metadata || {};
  const billingStatus = mapStripeSubscriptionStatus(subscription.status);
  if (!billingStatus) {
    throw new Error(`Unsupported Stripe subscription status: ${subscription.status}`);
  }

  return {
    agentId: agentId || metadata.agentId,
    userId: metadata.userId,
    ownerName: metadata.ownerName,
    subscriptionTier: metadata.subscriptionTier,
    stripeCustomerId: stripeId(subscription.customer),
    stripeSubscriptionId: subscription.id,
    trialEndsAt: stripeTimestampToIso(subscription.trial_end),
    billingStatus,
  };
}

function isAgentSiteCheckout(session: Stripe.Checkout.Session) {
  const metadata = session.metadata || {};
  return metadata.productType === 'agent_site' || (!metadata.orderType && session.mode === 'subscription');
}

function mapStripeSubscriptionStatus(status?: Stripe.Subscription.Status | string | null): AgentLaunchKit['billingProfile']['billingStatus'] | null {
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
