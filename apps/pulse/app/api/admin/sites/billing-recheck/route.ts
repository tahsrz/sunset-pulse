import { NextRequest } from 'next/server';
import { z } from 'zod';
import { errorResponse, notFoundResponse, successResponse } from '@/lib/core/apiResponse';
import { isAuthResponse, operatorAuditUser, requireOperatorRouteAccess } from '@/lib/core/routeAuth';
import { recheckSiteBillingFromStripe } from '@/lib/billing/siteBillingRecheck';
import { normalizeLaunchKit } from '@/lib/sites/launchKit';
import { readSiteConfig } from '@/lib/sites/siteConfigStore';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const billingRecheckSchema = z.object({
  agentId: z.string().trim().min(2).max(64),
});

export async function POST(request: NextRequest) {
  const access = await requireOperatorRouteAccess(request);
  if (isAuthResponse(access)) return access;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse('Request body must be valid JSON.', 400);
  }

  const parsed = billingRecheckSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse('Invalid billing recheck request.', 400, parsed.error.flatten());
  }

  const row = await readSiteConfig(parsed.data.agentId);
  if (!row) {
    return notFoundResponse('Agent site');
  }

  try {
    const result = await recheckSiteBillingFromStripe({
      kit: normalizeLaunchKit(row, parsed.data.agentId),
      source: 'admin-billing-recheck',
    });

    return successResponse({
      endpoint: '/api/admin/sites/billing-recheck',
      action: 'billing_recheck',
      operator: operatorAuditUser(access),
      ...result,
    });
  } catch (error: any) {
    const message = typeof error?.message === 'string'
      ? error.message
      : 'Failed to recheck site billing with Stripe.';

    return errorResponse(message, 400);
  }
}
