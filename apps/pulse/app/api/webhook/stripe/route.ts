export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import Stripe from 'stripe';
import { headers } from 'next/headers';
import connectDB from '@/lib/core/database';
import User from '@/models/User';
import Order from '@/models/Order';
import { successResponse, errorResponse } from '@/lib/core/apiResponse';
import { prisma } from '@/lib/core/prisma';
import { notifyStaffOfBurgerOrder } from '@/lib/twilio';
import { dispatchPaidOrderPhoneRelay } from '@/lib/grill/phoneRelay';
import { sendOrderConfirmationEmail } from '@/lib/grill/orderConfirmationEmail';
import {
  provisionPaidAgentSite,
  suspendProvisionedAgentSite,
  updateProvisionedAgentSiteBilling,
} from '@/lib/sites/siteProvisioning';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = (await headers()).get('stripe-signature');

  let event: Stripe.Event;

  try {
    if (!signature || !webhookSecret) {
      console.error('Webhook: Missing signature or secret');
      return errorResponse('Webhook Error: Missing signature or secret', 400);
    }
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: any) {
    console.error(`Webhook Error: ${err.message}`);
    return errorResponse(`Webhook Error: ${err.message}`, 400);
  }

  const session = event.data.object as Stripe.Checkout.Session;

  // Handle successful checkout
  if (event.type === 'checkout.session.completed') {
    await connectDB();
    const customerEmail = session.customer_email || session.customer_details?.email || null;
    const metadata = session.metadata;

    // 1. Handle Subscription Upgrades
    if (!metadata?.orderType && customerEmail) {
      await User.findOneAndUpdate({ email: customerEmail }, {
        subscriptionExpires: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      });
      console.log(`✅ [STRIPE_WEBHOOK] User ${customerEmail} upgraded to Premium.`);
    }

    // 2. Provision paid agent sites
    if (isAgentSiteCheckout(session)) {
      try {
        const provisionedSite = await provisionPaidAgentSite({
          agentId: metadata?.agentId,
          userId: metadata?.userId || session.client_reference_id,
          ownerName: metadata?.ownerName,
          email: customerEmail,
          subscriptionTier: metadata?.subscriptionTier,
          stripeCustomerId: stripeId(session.customer),
          stripeSubscriptionId: stripeId(session.subscription),
          stripeCheckoutSessionId: session.id,
          source: 'stripe-checkout',
        });

        console.log(
          `[STRIPE_WEBHOOK] Agent site ${provisionedSite.kit.agentId} ${provisionedSite.created ? 'provisioned' : 'refreshed'} from checkout ${session.id}.`,
        );
      } catch (error) {
        console.error('[STRIPE_WEBHOOK_SITE_PROVISIONING_ERROR]:', error);
      }
    }

    // 3. Handle Grill Food Orders
    if (metadata?.orderType === 'grill_food' && metadata?.orderId) {
      if (session.payment_status !== 'paid') {
        console.warn(`[STRIPE_WEBHOOK] Checkout session ${session.id} completed without paid status: ${session.payment_status}`);
        return successResponse({ received: true, ignored: 'checkout_not_paid' });
      }

      const existingOrder = await Order.findById(metadata.orderId);
      if (!existingOrder) {
        console.warn(`[STRIPE_WEBHOOK] Order ${metadata.orderId} not found for paid checkout session ${session.id}.`);
        return successResponse({ received: true, ignored: 'order_not_found' });
      }

      const wasAlreadyPaid = existingOrder.isPaid || ['PAID_STRIPE', 'PAID_POS'].includes(existingOrder.paymentState);
      const order = await Order.findByIdAndUpdate(metadata.orderId, {
        isPaid: true,
        paymentState: 'PAID_STRIPE',
        paymentSessionId: session.id,
        ...(customerEmail ? { customerEmail } : {}),
      }, { new: true });
      console.log(`🍔 [STRIPE_WEBHOOK] Order ${metadata.orderId} marked as PAID.`);

      if (wasAlreadyPaid) {
        console.log(`[STRIPE_WEBHOOK] Order ${metadata.orderId} was already paid. Skipping duplicate staff notification.`);
        return successResponse({ received: true, ignored: 'already_paid' });
      }

      try {
        if (order && customerEmail && order.emailConfirmation?.status !== 'sent') {
          const confirmationResult = await sendOrderConfirmationEmail({
            to: customerEmail,
            order,
          });

          if (confirmationResult.success) {
            await Order.findByIdAndUpdate(order._id, {
              'emailConfirmation.status': 'sent',
              'emailConfirmation.providerId': confirmationResult.id,
              'emailConfirmation.sentTo': customerEmail,
              'emailConfirmation.sentAt': new Date(),
              'emailConfirmation.updatedAt': new Date(),
            });
          } else if (confirmationResult.success === false) {
            await Order.findByIdAndUpdate(order._id, {
              'emailConfirmation.status': confirmationResult.status === 503 ? 'not_configured' : 'failed',
              'emailConfirmation.sentTo': customerEmail,
              'emailConfirmation.lastError': confirmationResult.reason,
              'emailConfirmation.updatedAt': new Date(),
            });
            console.error('[STRIPE_WEBHOOK_ORDER_CONFIRMATION_ERROR]:', confirmationResult);
          }
        }

        const targetTime = order?.scheduledTime ? new Date(order.scheduledTime) : null;
        
        let activeShiftBookings: any[] = [];
        try {
          if (targetTime) {
            // Query Cal.com shifts active precisely at the scheduled pickup time
            activeShiftBookings = await prisma.booking.findMany({
              where: {
                status: 'accepted',
                startTime: { lte: targetTime },
                endTime: { gte: targetTime },
                eventType: {
                  slug: {
                    in: ['grill-shift', 'register-shift'],
                  },
                },
              },
              include: {
                eventType: true,
                user: {
                  include: {
                    verifiedNumbers: true,
                  },
                },
              },
            });
          } else {
            // Default fallback: today's shift schedule
            const todayStart = new Date();
            todayStart.setHours(0, 0, 0, 0);
            const todayEnd = new Date();
            todayEnd.setHours(23, 59, 59, 999);

            activeShiftBookings = await prisma.booking.findMany({
              where: {
                status: 'accepted',
                startTime: {
                  gte: todayStart,
                  lte: todayEnd,
                },
                eventType: {
                  slug: {
                    in: ['grill-shift', 'register-shift'],
                  },
                },
              },
              include: {
                eventType: true,
                user: {
                  include: {
                    verifiedNumbers: true,
                  },
                },
              },
            });
          }
        } catch (scheduleError) {
          console.warn('[STRIPE_WEBHOOK_SHIFT_LOOKUP_SKIPPED]:', scheduleError);
        }

        let grillPhone: string | null = null;
        let registerPhone: string | null = null;

        for (const booking of activeShiftBookings) {
          const userPhone = booking.user?.verifiedNumbers?.[0]?.phoneNumber || null;
          if (booking.eventType?.slug === 'grill-shift') {
            grillPhone = userPhone;
          } else if (booking.eventType?.slug === 'register-shift') {
            registerPhone = userPhone;
          }
        }

        // Fallback to configured admin phone if nobody is scheduled
        const fallbackPhone = process.env.FALLBACK_NOTIFICATION_PHONE || null;
        if (!grillPhone && fallbackPhone) {
          console.log(`[STRIPE_WEBHOOK] No Grill Employee scheduled. Falling back to admin phone.`);
          grillPhone = fallbackPhone;
        }
        if (!registerPhone && fallbackPhone) {
          console.log(`[STRIPE_WEBHOOK] No Register Employee scheduled. Falling back to admin phone.`);
          registerPhone = fallbackPhone;
        }

        if (order) {
          await notifyStaffOfBurgerOrder(order, grillPhone, registerPhone);

          const relayPhone = process.env.PHONE_RELAY_STORE_PHONE;
          if (relayPhone) {
            const relayResult = await dispatchPaidOrderPhoneRelay({
              order,
              to: relayPhone,
              interactive: true,
            });

            if (!relayResult.success) {
              console.error('[STRIPE_WEBHOOK_PHONE_RELAY_ERROR]:', relayResult);
            }
          } else {
            await Order.findByIdAndUpdate(order._id, {
              'phoneRelay.status': 'not_configured',
              'phoneRelay.lastError': 'Missing PHONE_RELAY_STORE_PHONE.',
              'phoneRelay.updatedAt': new Date(),
            });
          }
        }
      } catch (err: any) {
        console.error('[STRIPE_WEBHOOK_STAFF_NOTIFICATION_ERROR]:', err);
      }
    }
  }

  // Handle subscription deletion/cancellation
  if (event.type === 'customer.subscription.updated') {
    const subscription = event.data.object as Stripe.Subscription;
    const metadata = subscription.metadata;

    if (isAgentSiteSubscription(subscription)) {
      try {
        const updatedSite = await updateProvisionedAgentSiteBilling({
          agentId: metadata?.agentId,
          userId: metadata?.userId,
          ownerName: metadata?.ownerName,
          subscriptionTier: metadata?.subscriptionTier,
          stripeCustomerId: stripeId(subscription.customer),
          stripeSubscriptionId: subscription.id,
          trialEndsAt: stripeTimestampToIso(subscription.trial_end),
          billingStatus: mapStripeSubscriptionStatus(subscription.status),
          source: 'stripe-subscription-updated',
        });

        if (updatedSite) {
          console.log(
            `[STRIPE_WEBHOOK] Agent site ${updatedSite.kit.agentId} billing updated to ${updatedSite.kit.billingProfile.billingStatus}.`,
          );
        }
      } catch (error) {
        console.error('[STRIPE_WEBHOOK_SITE_BILLING_UPDATE_ERROR]:', error);
      }
    }
  }

  if (event.type === 'customer.subscription.deleted') {
    await connectDB();
    const subscription = event.data.object as Stripe.Subscription;
    const metadata = subscription.metadata;

    if (isAgentSiteSubscription(subscription)) {
      try {
        const suspendedSite = await suspendProvisionedAgentSite({
          agentId: metadata?.agentId,
          userId: metadata?.userId,
          ownerName: metadata?.ownerName,
          subscriptionTier: metadata?.subscriptionTier,
          stripeCustomerId: stripeId(subscription.customer),
          stripeSubscriptionId: subscription.id,
          source: 'stripe-subscription',
        });

        if (suspendedSite) {
          console.log(`[STRIPE_WEBHOOK] Agent site ${suspendedSite.kit.agentId} suspended after subscription ${subscription.id} ended.`);
        }
      } catch (error) {
        console.error('[STRIPE_WEBHOOK_SITE_SUSPENSION_ERROR]:', error);
      }
    }
    console.log(`📡 [STRIPE_WEBHOOK] Subscription ${subscription.id} deleted.`);
  }

  return successResponse({ received: true });
}

function isAgentSiteCheckout(session: Stripe.Checkout.Session) {
  const metadata = session.metadata || {};
  return metadata.productType === 'agent_site' || (!metadata.orderType && session.mode === 'subscription');
}

function isAgentSiteSubscription(subscription: Stripe.Subscription) {
  const metadata = subscription.metadata || {};
  return metadata.productType === 'agent_site' || Boolean(metadata.agentId);
}

function stripeId(value: string | { id?: string } | null) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  return value.id || '';
}

function stripeTimestampToIso(value?: number | null) {
  if (!value) return '';
  const date = new Date(value * 1000);
  return Number.isFinite(date.getTime()) ? date.toISOString() : '';
}

function mapStripeSubscriptionStatus(status?: Stripe.Subscription.Status | string | null) {
  if (status === 'trialing') return 'trialing';
  if (status === 'active') return 'active';
  if (status === 'past_due') return 'past_due';
  if (status === 'canceled') return 'canceled';
  if (status === 'unpaid') return 'unpaid';
  if (status === 'incomplete') return 'incomplete';
  if (status === 'incomplete_expired' || status === 'paused') return 'unpaid';
  return 'unknown';
}
