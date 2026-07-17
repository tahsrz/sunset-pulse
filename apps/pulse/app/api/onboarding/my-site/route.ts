import { NextRequest } from 'next/server';
import { errorResponse, successResponse, unauthorizedResponse } from '@/lib/core/apiResponse';
import { getSessionUser } from '@/lib/core/getSessionUser';
import { getLaunchKitSummary, normalizeLaunchKit } from '@/lib/sites/launchKit';
import { readSiteConfigByOwnerUser } from '@/lib/sites/siteConfigStore';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(_request: NextRequest) {
  const sessionUser = await getSessionUser();
  if (!sessionUser?.userId) {
    return unauthorizedResponse('Sign in to load your agent site.');
  }

  try {
    const row = await readSiteConfigByOwnerUser(sessionUser.userId);
    if (!row) {
      return successResponse({ site: null });
    }

    const kit = normalizeLaunchKit(row);
    const summary = getLaunchKitSummary(kit);

    return successResponse({
      site: {
        setupUrl: kit.billingProfile.stripeCheckoutSessionId
          ? `/onboarding/site/setup?session_id=${encodeURIComponent(kit.billingProfile.stripeCheckoutSessionId)}`
          : `/onboarding/site/setup`,
        reviewStatus: kit.reviewProfile.status,
        billingStatus: kit.billingProfile.billingStatus,
        trialEndsAt: kit.billingProfile.trialEndsAt,
        gracePeriodEndsAt: kit.billingProfile.gracePeriodEndsAt,
        billingStatusChangedAt: kit.billingProfile.billingStatusChangedAt,
        ...summary,
      },
    });
  } catch (error: any) {
    return errorResponse(error.message || 'Failed to load your agent site.', 500);
  }
}
