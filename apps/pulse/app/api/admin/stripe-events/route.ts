import { NextRequest } from 'next/server';
import { z } from 'zod';
import { errorResponse, notFoundResponse, successResponse } from '@/lib/core/apiResponse';
import { isAuthResponse, operatorAuditUser, requireOperatorRouteAccess } from '@/lib/core/routeAuth';
import { replayStripeSiteEvent } from '@/lib/billing/stripeEventReplay';
import { listStripeWebhookEvents } from '@/lib/billing/stripeWebhookLedger';
import { normalizeLaunchKit } from '@/lib/sites/launchKit';
import { readSiteConfig } from '@/lib/sites/siteConfigStore';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const replaySchema = z.object({
  eventId: z.string().trim().min(4).max(120),
  agentId: z.string().trim().min(2).max(64).optional(),
});

export async function GET(request: NextRequest) {
  const access = await requireOperatorRouteAccess(request);
  if (isAuthResponse(access)) return access;

  const agentId = request.nextUrl.searchParams.get('agentId') || '';
  const limit = Number(request.nextUrl.searchParams.get('limit') || 25);

  try {
    const objectIds = agentId ? await resolveSiteStripeObjectIds(agentId) : [];
    if (agentId && objectIds === null) {
      return notFoundResponse('Agent site');
    }

    const events = await listStripeWebhookEvents({
      objectIds: objectIds || [],
      limit: Number.isFinite(limit) ? limit : 25,
    });

    return successResponse({
      endpoint: '/api/admin/stripe-events',
      action: 'stripe_events_list',
      operator: operatorAuditUser(access),
      agentId,
      objectIds: objectIds || [],
      events,
    });
  } catch (error: any) {
    return errorResponse(error?.message || 'Failed to load Stripe events.', 500);
  }
}

export async function POST(request: NextRequest) {
  const access = await requireOperatorRouteAccess(request);
  if (isAuthResponse(access)) return access;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse('Request body must be valid JSON.', 400);
  }

  const parsed = replaySchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse('Invalid Stripe event replay request.', 400, parsed.error.flatten());
  }

  if (parsed.data.agentId) {
    const row = await readSiteConfig(parsed.data.agentId);
    if (!row) {
      return notFoundResponse('Agent site');
    }
  }

  try {
    const result = await replayStripeSiteEvent({
      eventId: parsed.data.eventId,
      agentId: parsed.data.agentId,
      source: 'admin-stripe-event-replay',
    });

    return successResponse({
      endpoint: '/api/admin/stripe-events',
      action: 'stripe_event_replay',
      operator: operatorAuditUser(access),
      ...result,
    });
  } catch (error: any) {
    return errorResponse(error?.message || 'Failed to replay Stripe event.', 400);
  }
}

async function resolveSiteStripeObjectIds(agentId: string) {
  const row = await readSiteConfig(agentId);
  if (!row) return null;

  const kit = normalizeLaunchKit(row, agentId);
  return Array.from(new Set([
    kit.billingProfile.stripeCheckoutSessionId,
    kit.billingProfile.stripeSubscriptionId,
    kit.billingProfile.stripeCustomerId,
  ].filter(Boolean)));
}
