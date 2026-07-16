export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { errorResponse, successResponse } from '@/lib/core/apiResponse';
import { expirePastDueGracePeriods } from '@/lib/sites/siteProvisioning';

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('Authorization') || '';
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    return errorResponse('Cron secret is not configured.', 503);
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    console.warn('[SITE_BILLING_GRACE_CRON_UNAUTHORIZED]');
    return errorResponse('Unauthorized: Invalid cron token.', 401);
  }

  try {
    const limitParam = req.nextUrl.searchParams.get('limit');
    const limit = normalizeLimit(limitParam);
    const result = await expirePastDueGracePeriods({
      limit,
      source: 'site-billing-grace-cron',
    });

    return successResponse({
      message: 'Site billing grace expiry check completed.',
      ...result,
    });
  } catch (error: any) {
    console.error('[SITE_BILLING_GRACE_CRON_ERROR]:', error);
    return errorResponse('Site billing grace expiry check failed.', 500, error?.message || null);
  }
}

function normalizeLimit(value: string | null) {
  if (!value) return 50;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 50;
  return Math.max(1, Math.min(200, Math.floor(parsed)));
}
