import { NextRequest } from 'next/server';
import Stripe from 'stripe';
import { z } from 'zod';
import { errorResponse, successResponse, unauthorizedResponse } from '@/lib/core/apiResponse';
import { getSessionUser } from '@/lib/core/getSessionUser';
import { getLaunchKitSummary, normalizeLaunchKit } from '@/lib/sites/launchKit';
import { provisionPaidAgentSite, resolveProvisionedAgentId, updateProvisionedAgentSiteBilling } from '@/lib/sites/siteProvisioning';
import { readSiteConfig, saveSiteConfig } from '@/lib/sites/siteConfigStore';
import { getStripeClient } from '@/lib/stripeClient';
import { notifyOperatorSiteSetupSaved } from '@/lib/sites/siteLifecycleNotifications';
import {
  getSiteCheckoutBillingSnapshot,
  SITE_SUBSCRIPTION_TRIAL_DAYS,
  stripeId,
} from '@/lib/billing/siteSubscriptionCheckout';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const optionalStringSchema = z.preprocess(
  trimOptionalString,
  z.string().max(1_500).optional(),
);
const optionalUrlSchema = z.preprocess(
  trimOptionalString,
  z.string().url().optional().or(z.literal('')),
);
const hexColorSchema = z.string().trim().regex(/^#[0-9a-f]{6}$/i);
const buyerSetupSchema = z.object({
  ownerName: z.string().trim().min(2).max(120),
  branding: z.object({
    siteName: z.string().trim().min(2).max(120),
    primaryColor: hexColorSchema,
    fontFamily: z.string().trim().min(2).max(80),
  }),
  hero: z.object({
    title: z.string().trim().min(2).max(160),
    subtitle: z.string().trim().min(2).max(260),
    backgroundImage: optionalUrlSchema,
  }),
  agentProfile: z.object({
    displayName: z.string().trim().min(2).max(120),
    brokerageName: z.string().trim().min(2).max(120),
    licenseNumber: optionalStringSchema,
    phone: optionalStringSchema,
    email: optionalStringSchema,
    markets: z.array(z.string().trim().min(1).max(80)).min(1).max(20),
    headshotUrl: optionalUrlSchema,
    officeAddress: optionalStringSchema,
  }),
  complianceProfile: z.object({
    jurisdiction: z.string().trim().min(2).max(80),
    footerDisclaimer: z.string().trim().min(8).max(1_500),
    mlsDisclaimer: z.string().trim().min(8).max(1_500),
    equalHousing: z.boolean(),
  }),
  integrationProfile: z.object({
    leadEmail: optionalStringSchema,
    calendarUrl: optionalUrlSchema,
    crmTag: optionalStringSchema,
  }),
});

export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get('session_id') || '';
  if (!sessionId.startsWith('cs_')) {
    return errorResponse('A valid checkout session is required.', 400);
  }

  const sessionUser = await getSessionUser();
  if (!sessionUser?.userId) {
    return unauthorizedResponse('Sign in to continue site onboarding.');
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    return errorResponse('Stripe is not configured for onboarding.', 500);
  }

  try {
    const { row, session, summary, billingSnapshot } = await loadOwnedOnboardingSession(request, sessionUser);
    const kit = summary.kit;

    return successResponse({
      status: row ? 'ready' : 'reconciled',
      sessionId: session.id,
      trialDays: SITE_SUBSCRIPTION_TRIAL_DAYS,
      setupUrl: `/onboarding/site/setup?session_id=${encodeURIComponent(session.id)}`,
      previewPath: `/sites/${encodeURIComponent(kit.subdomain)}`,
      buyerStatus: buildBuyerStatus(kit, row ? 'site_ready' : 'site_reconciled', billingSnapshot),
      ...summary,
    });
  } catch (error: any) {
    if (error instanceof OnboardingError) {
      return errorResponse(error.message, error.status);
    }

    const message = error instanceof Stripe.errors.StripeError
      ? error.message
      : 'Failed to load site onboarding.';
    return errorResponse(message, 500, error.message);
  }
}

export async function PUT(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get('session_id') || '';
  if (!sessionId.startsWith('cs_')) {
    return errorResponse('A valid checkout session is required.', 400);
  }

  const sessionUser = await getSessionUser();
  if (!sessionUser?.userId) {
    return unauthorizedResponse('Sign in to continue site onboarding.');
  }

  try {
    const { session, summary } = await loadOwnedOnboardingSession(request, sessionUser);
    const body = await request.json();
    const parsed = buyerSetupSchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse('Invalid site setup profile.', 400, parsed.error.flatten());
    }

    const current = summary.kit;
    const input = parsed.data;
    const requestReview = body?.requestReview === true;
    const now = new Date().toISOString();
    const kit = normalizeLaunchKit({
      ...current,
      ownerName: input.ownerName,
      branding: {
        ...current.branding,
        ...input.branding,
      },
      hero: {
        ...current.hero,
        ...input.hero,
      },
      agentProfile: {
        ...current.agentProfile,
        ...input.agentProfile,
      },
      complianceProfile: {
        ...current.complianceProfile,
        ...input.complianceProfile,
      },
      integrationProfile: {
        ...current.integrationProfile,
        leadEmail: input.integrationProfile.leadEmail,
        calendarUrl: input.integrationProfile.calendarUrl,
        crmTag: input.integrationProfile.crmTag,
      },
      reviewProfile: {
        ...current.reviewProfile,
        status: requestReview ? 'requested' : current.reviewProfile.status === 'not_started' ? 'setup_saved' : current.reviewProfile.status,
        requestedAt: requestReview ? now : current.reviewProfile.requestedAt,
        requestedBy: requestReview ? sessionUser.userId : current.reviewProfile.requestedBy,
      },
    }, current.agentId);

    const savedStores = await saveSiteConfig(kit, {
      role: 'buyer-onboarding',
      email: session.customer_email || session.customer_details?.email || sessionUser.user.email,
      userId: sessionUser.userId,
    });
    const updatedSummary = getLaunchKitSummary(kit);
    const emailResult = await notifyOperatorSiteSetupSaved({
      kit,
      setupUrl: `/onboarding/site/setup?session_id=${encodeURIComponent(session.id)}`,
      reviewUrl: `/admin/site-reviews?agentId=${encodeURIComponent(kit.agentId)}`,
      requestedReview: requestReview,
    });
    if (emailResult.status === 'failed') {
      console.warn('[SITE_SETUP_OPERATOR_EMAIL_FAILED]', emailResult.reason);
    }

    return successResponse({
      status: 'saved',
      sessionId: session.id,
      trialDays: SITE_SUBSCRIPTION_TRIAL_DAYS,
      setupUrl: `/onboarding/site/setup?session_id=${encodeURIComponent(session.id)}`,
      previewPath: `/sites/${encodeURIComponent(kit.subdomain)}`,
      buyerStatus: buildBuyerStatus(kit, 'setup_saved'),
      savedStores,
      emailNotification: emailResult,
      ...updatedSummary,
    });
  } catch (error: any) {
    if (error instanceof OnboardingError) {
      return errorResponse(error.message, error.status);
    }

    const message = error instanceof Stripe.errors.StripeError
      ? error.message
      : 'Failed to save site setup.';
    return errorResponse(message, 500, error.message);
  }
}

async function loadOwnedOnboardingSession(request: NextRequest, sessionUser: any) {
  const sessionId = request.nextUrl.searchParams.get('session_id') || '';
  const session = await getStripeClient().checkout.sessions.retrieve(sessionId, {
    expand: ['subscription'],
  });
  if (!isAgentSiteCheckout(session)) {
    throw new OnboardingError('Checkout session is not an agent-site subscription.', 400);
  }

  const sessionUserId = session.metadata?.userId || session.client_reference_id || '';
  if (sessionUserId && sessionUserId !== sessionUser.userId) {
    throw new OnboardingError('Checkout session belongs to another user.', 403);
  }

  const customerEmail = session.customer_email || session.customer_details?.email || sessionUser.user.email || '';
  const billingSnapshot = getSiteCheckoutBillingSnapshot(session);
  const provisioningInput = {
    agentId: session.metadata?.agentId,
    userId: sessionUser.userId,
    ownerName: session.metadata?.ownerName || sessionUser.user.name,
    email: customerEmail,
    subscriptionTier: session.metadata?.subscriptionTier,
    stripeCustomerId: stripeId(session.customer),
    stripeSubscriptionId: billingSnapshot.stripeSubscriptionId || stripeId(session.subscription),
    stripeCheckoutSessionId: session.id,
    trialEndsAt: billingSnapshot.trialEndsAt,
    billingStatus: billingSnapshot.billingStatus,
    source: 'checkout-onboarding',
  };
  const agentId = resolveProvisionedAgentId(provisioningInput);
  const row = await readSiteConfig(agentId);
  let summary = row
    ? getLaunchKitSummary(normalizeLaunchKit(row, agentId))
    : await provisionPaidAgentSite(provisioningInput);

  if (row && shouldRefreshBillingFromStripe(summary.kit, billingSnapshot)) {
    const updatedSummary = await updateProvisionedAgentSiteBilling({
      ...provisioningInput,
      source: 'checkout-onboarding-reconcile',
    });
    if (updatedSummary) {
      summary = updatedSummary;
    }
  }

  return { row, session, summary, billingSnapshot };
}

function isAgentSiteCheckout(session: Stripe.Checkout.Session) {
  const metadata = session.metadata || {};
  return metadata.productType === 'agent_site' || (!metadata.orderType && session.mode === 'subscription');
}

class OnboardingError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

function shouldRefreshBillingFromStripe(
  kit: ReturnType<typeof normalizeLaunchKit>,
  billingSnapshot: ReturnType<typeof getSiteCheckoutBillingSnapshot>,
) {
  if (!billingSnapshot.billingStatus && !billingSnapshot.trialEndsAt) {
    return false;
  }

  return (
    (billingSnapshot.billingStatus && billingSnapshot.billingStatus !== kit.billingProfile.billingStatus)
    || (billingSnapshot.trialEndsAt && billingSnapshot.trialEndsAt !== kit.billingProfile.trialEndsAt)
  );
}

function buildBuyerStatus(
  kit: ReturnType<typeof normalizeLaunchKit>,
  provisioningStatus: 'site_ready' | 'site_reconciled' | 'setup_saved',
  billingSnapshot?: ReturnType<typeof getSiteCheckoutBillingSnapshot>,
) {
  const billingStatus = billingSnapshot?.billingStatus || kit.billingProfile.billingStatus;
  const trialEndsAt = billingSnapshot?.trialEndsAt || kit.billingProfile.trialEndsAt || '';
  const billingNeedsAttention = billingStatus === 'past_due'
    || billingStatus === 'canceled'
    || billingStatus === 'unpaid'
    || billingStatus === 'incomplete';

  return {
    payment: {
      state: billingNeedsAttention ? 'action_needed' : 'received',
      stripePaymentStatus: billingSnapshot?.checkoutPaymentStatus || 'unknown',
    },
    provisioning: {
      state: provisioningStatus,
      siteStatus: kit.status,
    },
    trial: {
      state: billingStatus === 'trialing' ? 'verified' : billingStatus,
      verified: billingSnapshot?.trialVerified || (billingStatus === 'trialing' && Boolean(trialEndsAt)),
      daysExpected: SITE_SUBSCRIPTION_TRIAL_DAYS,
      daysObserved: billingSnapshot?.trialDaysObserved ?? null,
      endsAt: trialEndsAt,
    },
    actionNeeded: billingNeedsAttention,
  };
}

function trimOptionalString(value: unknown) {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : '';
}
