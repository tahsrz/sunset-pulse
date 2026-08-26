import { NextRequest } from 'next/server';
import { z } from 'zod';
import { errorResponse, notFoundResponse, successResponse } from '@/lib/core/apiResponse';
import { isAuthResponse, operatorAuditUser, requireOperatorRouteAccess } from '@/lib/core/routeAuth';
import {
  getLaunchKitSummary,
  normalizeLaunchKit,
  type AgentLaunchKit,
} from '@/lib/sites/launchKit';
import { readSiteConfig, saveSiteConfig } from '@/lib/sites/siteConfigStore';
import { notifyBuyerSiteReviewDecision } from '@/lib/sites/siteLifecycleNotifications';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const reviewActionSchema = z.object({
  agentId: z.string().trim().min(2).max(64),
  action: z.enum(['mark_in_review', 'request_changes', 'approve_publish']),
  notes: z.string().trim().max(1_500).optional().or(z.literal('')),
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

  const parsed = reviewActionSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse('Invalid review action.', 400, parsed.error.flatten());
  }

  const row = await readSiteConfig(parsed.data.agentId);
  if (!row) {
    return notFoundResponse('Agent site');
  }

  const operator = operatorAuditUser(access);
  const current = normalizeLaunchKit(row, parsed.data.agentId);
  const nextKit = buildReviewedKit(current, parsed.data.action, parsed.data.notes || '', operator);
  const summary = getLaunchKitSummary(nextKit);

  if (parsed.data.action === 'approve_publish' && !summary.readyToPublish) {
    return errorResponse(
      'Site cannot be approved and published until buyer-safe checks pass.',
      400,
      summary.publishGate.checks.filter((check) => !check.complete),
    );
  }

  const savedStores = await saveSiteConfig(nextKit, operator);
  const buyerEmail = nextKit.agentProfile.email || nextKit.integrationProfile.leadEmail || '';
  const emailNotification = parsed.data.action === 'approve_publish' || parsed.data.action === 'request_changes'
    ? await notifyBuyerSiteReviewDecision({
      kit: nextKit,
      email: buyerEmail,
      setupUrl: `/onboarding/site/setup?session_id=${encodeURIComponent(nextKit.billingProfile.stripeCheckoutSessionId || '')}`,
      publicUrl: summary.publicUrl,
      decision: parsed.data.action === 'approve_publish' ? 'approved' : 'changes_requested',
      notes: parsed.data.notes,
    })
    : { status: 'skipped', reason: 'no buyer notification for in-review state' };

  if (emailNotification.status === 'failed') {
    console.warn('[SITE_REVIEW_BUYER_EMAIL_FAILED]', emailNotification.reason);
  }

  return successResponse({
    endpoint: '/api/admin/sites/review',
    action: parsed.data.action,
    savedStores,
    emailNotification,
    ...summary,
  });
}

function buildReviewedKit(
  kit: AgentLaunchKit,
  action: z.infer<typeof reviewActionSchema>['action'],
  notes: string,
  operator: ReturnType<typeof operatorAuditUser>,
) {
  const now = new Date().toISOString();
  const reviewer = operator.email || operator.name || operator.userId || operator.role || 'operator';

  if (action === 'approve_publish') {
    return normalizeLaunchKit({
      ...kit,
      status: 'active',
      reviewProfile: {
        ...kit.reviewProfile,
        status: 'approved',
        reviewedAt: now,
        reviewedBy: reviewer,
        notes,
      },
    }, kit.agentId);
  }

  if (action === 'request_changes') {
    return normalizeLaunchKit({
      ...kit,
      status: 'draft',
      reviewProfile: {
        ...kit.reviewProfile,
        status: 'changes_requested',
        reviewedAt: now,
        reviewedBy: reviewer,
        notes,
      },
    }, kit.agentId);
  }

  return normalizeLaunchKit({
    ...kit,
    reviewProfile: {
      ...kit.reviewProfile,
      status: 'in_review',
      reviewedAt: now,
      reviewedBy: reviewer,
      notes,
    },
  }, kit.agentId);
}
