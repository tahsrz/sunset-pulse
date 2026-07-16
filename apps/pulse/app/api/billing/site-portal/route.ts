import { NextRequest } from 'next/server';
import { errorResponse, successResponse, unauthorizedResponse } from '@/lib/core/apiResponse';
import { getSessionUser } from '@/lib/core/getSessionUser';
import { getLaunchKitSummary, normalizeLaunchKit } from '@/lib/sites/launchKit';
import { readSiteConfigByOwnerUser } from '@/lib/sites/siteConfigStore';
import { getStripeClient } from '@/lib/stripeClient';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const sessionUser = await getSessionUser();
  if (!sessionUser?.userId) {
    return unauthorizedResponse('Sign in to manage billing.');
  }

  try {
    const row = await readSiteConfigByOwnerUser(sessionUser.userId);
    if (!row) {
      return errorResponse('No agent site billing profile was found for this user.', 404);
    }

    const kit = normalizeLaunchKit(row);
    const customerId = kit.billingProfile.stripeCustomerId;
    if (!customerId) {
      return errorResponse('This site does not have a Stripe customer yet.', 400);
    }

    const origin = getOrigin(request);
    const returnUrl = `${origin}/dashboard`;
    const portalSession = await getStripeClient().billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
      ...(process.env.STRIPE_BILLING_PORTAL_CONFIGURATION_ID
        ? { configuration: process.env.STRIPE_BILLING_PORTAL_CONFIGURATION_ID }
        : {}),
    });

    return successResponse({
      url: portalSession.url,
      ...getLaunchKitSummary(kit),
    });
  } catch (error: any) {
    return errorResponse(error.message || 'Failed to create billing portal session.', 500);
  }
}

function getOrigin(request: NextRequest) {
  return (
    process.env.NEXT_PUBLIC_DOMAIN ||
    process.env.NEXT_PUBLIC_APP_URL ||
    request.nextUrl.origin ||
    'https://sunsetpulse.app'
  ).replace(/\/+$/, '');
}
