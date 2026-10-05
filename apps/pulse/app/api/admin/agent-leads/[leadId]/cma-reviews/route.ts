import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { isAuthResponse, requireOperatorRouteAccess } from '@/lib/core/routeAuth';
import { privateCmaReviewInputSchema, privateCmaReviewSchema } from '@/lib/marketing/privateCmaReviewSchema';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const leadIdSchema = z.string().uuid();
const requestSchema = privateCmaReviewInputSchema;
const allowedRoles = new Set(['realtor', 'operator', 'admin']);
const MAX_BODY_BYTES = 32_000;
const RETENTION_MS = 90 * 24 * 60 * 60 * 1_000;
const REVIEW_CLOCK_SKEW_MS = 60_000;

type RouteContext = { params: Promise<{ leadId: string }> };
type Scope = { leadId: string; agentId: string; ownerId: string };

export async function GET(request: NextRequest, context: RouteContext) {
  const scope = await resolveOwnedPricingLead(request, context);
  if (scope instanceof Response) return scope;

  const now = new Date().toISOString();
  const { data: consent, error: consentError } = await loadCurrentConsent(scope);
  if (consentError) return privateError('Seller consent could not be verified.', 503);
  if (!isCurrentConsent(consent)) return privateError('Current recorded seller permission is required to access CMA reviews.', 409);

  const { data, error } = await supabaseAdmin
    .from('seller_cma_private_reviews')
    .select('review_data')
    .eq('lead_id', scope.leadId)
    .eq('agent_id', scope.agentId)
    .eq('owner_user_id', scope.ownerId)
    .gt('expires_at', now)
    .order('revision', { ascending: true });

  if (error) return privateError('Private CMA reviews are temporarily unavailable.', 503);
  const reviews = [];
  for (const row of data || []) {
    const result = privateCmaReviewSchema.safeParse((row as { review_data: unknown }).review_data);
    if (!result.success) return privateError('A saved private CMA review could not be verified.', 503);
    reviews.push(result.data);
  }
  return privateJson({
    ok: true,
    actorUserId: scope.ownerId,
    consentEvidenceRef: consentEvidenceRef(scope.leadId, consent.consent_captured_at),
    reviews,
  });
}

export async function POST(request: NextRequest, context: RouteContext) {
  const scope = await resolveOwnedPricingLead(request, context);
  if (scope instanceof Response) return scope;

  const bodyText = await request.text();
  if (new TextEncoder().encode(bodyText).byteLength > MAX_BODY_BYTES) return privateError('The request is too large.', 413);

  let raw: unknown;
  try {
    raw = JSON.parse(bodyText);
  } catch {
    return privateError('A valid JSON request body is required.', 400);
  }
  const parsedInput = requestSchema.safeParse(raw);
  if (!parsedInput.success) return privateError('Check the private review fields and source evidence.', 400);

  const { data: consent, error: consentError } = await loadCurrentConsent(scope);
  if (consentError) return privateError('Seller consent could not be verified.', 503);
  if (!isCurrentConsent(consent)) {
    return privateError('Current recorded seller permission is required before saving a CMA review.', 409);
  }

  const { data: latestRows, error: latestError } = await supabaseAdmin
    .from('seller_cma_private_reviews')
    .select('review_id, revision')
    .eq('lead_id', scope.leadId)
    .eq('agent_id', scope.agentId)
    .eq('owner_user_id', scope.ownerId)
    .order('revision', { ascending: false })
    .limit(1);
  if (latestError) return privateError('The prior private CMA revision could not be checked.', 503);
  const latest = latestRows?.[0] || null;
  const now = new Date();
  const preparedAt = now.toISOString();
  const expiresAt = new Date(Math.min(now.getTime() + RETENTION_MS, Date.parse(consent.expires_at))).toISOString();
  if (Date.parse(expiresAt) <= now.getTime()) return privateError('Seller permission has expired; capture permission again first.', 409);

  if (parsedInput.data.status === 'reviewed' && !parsedInput.data.methodologyNote) {
    return privateError('A reviewed CMA requires a human methodology note.', 400);
  }
  if (parsedInput.data.status === 'draft' && parsedInput.data.methodologyNote) {
    return privateError('A draft cannot carry a completed review methodology.', 400);
  }

  const candidate = privateCmaReviewSchema.safeParse({
    schemaVersion: 1,
    reviewId: randomUUID(),
    revision: (latest?.revision || 0) + 1,
    supersedesReviewId: latest?.review_id || null,
    leadId: scope.leadId,
    status: parsedInput.data.status,
    useRestriction: 'private-review-only',
    preparedAt,
    expiresAt,
    subject: parsedInput.data.subject,
    comparables: parsedInput.data.comparables,
    suggestedRangeUsd: parsedInput.data.suggestedRangeUsd,
    review: {
      reviewerUserId: parsedInput.data.status === 'reviewed' ? scope.ownerId : null,
      reviewedAt: parsedInput.data.status === 'reviewed' ? preparedAt : null,
      sellerPermissionEvidenceRef: parsedInput.data.status === 'reviewed' ? consentEvidenceRef(scope.leadId, consent.consent_captured_at) : null,
      methodologyNote: parsedInput.data.status === 'reviewed' ? parsedInput.data.methodologyNote : null,
    },
  });
  if (!candidate.success) return privateError('The private CMA review does not satisfy the reviewed evidence contract.', 400);
  if (Date.parse(candidate.data.preparedAt) < Date.parse(consent.consent_captured_at)
    || Date.parse(candidate.data.review.reviewedAt || preparedAt) > Date.now() + REVIEW_CLOCK_SKEW_MS) {
    return privateError('The review time is outside the active seller-consent window.', 409);
  }

  const { data: inserted, error: insertError } = await supabaseAdmin
    .from('seller_cma_private_reviews')
    .insert({
      review_id: candidate.data.reviewId,
      lead_id: scope.leadId,
      agent_id: scope.agentId,
      owner_user_id: scope.ownerId,
      revision: candidate.data.revision,
      supersedes_review_id: candidate.data.supersedesReviewId,
      status: candidate.data.status,
      review_data: candidate.data,
      prepared_at: candidate.data.preparedAt,
      expires_at: candidate.data.expiresAt,
    })
    .select('review_id')
    .single();

  if (insertError?.code === '23505' || insertError?.code === '23514') {
    return privateError('A newer review revision was saved first. Reload the reviews and try again.', 409);
  }
  if (insertError?.code === '42501') return privateError('Current seller permission is required for this review.', 409);
  if (insertError || !inserted) return privateError('The private CMA review could not be saved.', 503);

  return privateJson({ ok: true, review: candidate.data }, 201);
}

async function resolveOwnedPricingLead(request: NextRequest, context: RouteContext): Promise<Scope | Response> {
  const access = await requireOperatorRouteAccess(request);
  if (isAuthResponse(access)) return access;
  if (access.mode !== 'authenticated' || !access.user?.id) return privateError('Sign in with the owning account to access private CMA reviews.', 401);
  if (!allowedRoles.has(access.user.role)) return privateError('This account cannot access private CMA reviews.', 403);

  const { leadId: rawLeadId } = await context.params;
  const parsedLeadId = leadIdSchema.safeParse(rawLeadId);
  if (!parsedLeadId.success) return privateError('Lead not found.', 404);

  const { data: lead, error: leadError } = await supabaseAdmin
    .from('agent_site_leads')
    .select('id, agent_id, metadata')
    .eq('id', parsedLeadId.data)
    .eq('source', 'seller_plan')
    .maybeSingle();
  if (leadError) return privateError('Private CMA reviews are temporarily unavailable.', 503);
  if (!lead || !isPricingReviewLead(lead.metadata)) return privateError('Lead not found.', 404);

  const { data: site, error: siteError } = await supabaseAdmin
    .from('site_config')
    .select('agent_id')
    .eq('agent_id', lead.agent_id)
    .eq('owner_id', access.user.id)
    .maybeSingle();
  if (siteError) return privateError('Private CMA reviews are temporarily unavailable.', 503);
  if (!site) return privateError('Lead not found.', 404);
  return { leadId: lead.id, agentId: lead.agent_id, ownerId: access.user.id };
}

async function loadCurrentConsent(scope: Scope) {
  return supabaseAdmin
    .from('seller_cma_private_details')
    .select('seller_permission_confirmed, consent_text_version, consent_captured_at, expires_at')
    .eq('lead_id', scope.leadId)
    .eq('agent_id', scope.agentId)
    .eq('owner_user_id', scope.ownerId)
    .maybeSingle();
}

function isCurrentConsent(consent: { seller_permission_confirmed: boolean; consent_text_version: string; consent_captured_at: string; expires_at: string } | null): consent is {
  seller_permission_confirmed: boolean;
  consent_text_version: string;
  consent_captured_at: string;
  expires_at: string;
} {
  return Boolean(consent
    && consent.seller_permission_confirmed === true
    && consent.consent_text_version === 'cma-address-consent.v1'
    && Date.parse(consent.expires_at) > Date.now());
}

function consentEvidenceRef(leadId: string, capturedAt: string) {
  return `seller-cma-consent:${leadId}:${capturedAt}`;
}

function isPricingReviewLead(metadata: unknown): boolean {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return false;
  const sellerPlan = (metadata as Record<string, unknown>).sellerPlan;
  return Boolean(sellerPlan && typeof sellerPlan === 'object' && !Array.isArray(sellerPlan)
    && (sellerPlan as Record<string, unknown>).requestKind === 'pricing_review');
}

function privateError(error: string, status: number) {
  return privateJson({ ok: false, error }, status);
}

function privateJson(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, { status, headers: { 'Cache-Control': 'private, no-store' } });
}
