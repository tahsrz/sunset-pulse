import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { isAuthResponse, requireOperatorRouteAccess } from '@/lib/core/routeAuth';
import { supabaseAdmin } from '@/lib/supabase';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const leadIdSchema = z.string().uuid();
const requestSchema = z.object({
  propertyAddress: z.string().trim().min(6).max(240),
  sellerPermissionConfirmed: z.literal(true),
}).strict();
const permittedRoles = new Set(['realtor', 'operator', 'admin']);
const CONSENT_TEXT_VERSION = 'cma-address-consent.v1';
const MAX_BODY_BYTES = 2_000;

type RouteContext = { params: Promise<{ leadId: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  const scope = await resolveOwnedCmaLead(request, context);
  if (scope instanceof Response) return scope;

  const sessionClient = createClient();
  const { data, error } = await sessionClient
    .from('seller_cma_private_details')
    .select('property_address, consent_captured_at, expires_at')
    .eq('lead_id', scope.leadId)
    .eq('owner_user_id', scope.ownerId)
    .maybeSingle();

  if (error) return privateError('CMA details are temporarily unavailable.', 503);
  return privateJson({
    ok: true,
    details: data ? {
      propertyAddress: data.property_address,
      consentCapturedAt: data.consent_captured_at,
      expiresAt: data.expires_at,
    } : null,
  });
}

export async function POST(request: NextRequest, context: RouteContext) {
  const scope = await resolveOwnedCmaLead(request, context);
  if (scope instanceof Response) return scope;

  const bodyText = await request.text();
  if (new TextEncoder().encode(bodyText).byteLength > MAX_BODY_BYTES) return privateError('The request is too large.', 413);
  let raw: unknown;
  try {
    raw = JSON.parse(bodyText);
  } catch {
    return privateError('A valid JSON request body is required.', 400);
  }
  const parsed = requestSchema.safeParse(raw);
  if (!parsed.success) return privateError('Confirm seller permission and check the property address.', 400);

  const { error: expiredCleanupError } = await supabaseAdmin
    .from('seller_cma_private_details')
    .delete()
    .eq('lead_id', scope.leadId)
    .eq('owner_user_id', scope.ownerId)
    .lte('expires_at', new Date().toISOString());
  if (expiredCleanupError) return privateError('Expired CMA details could not be cleared before replacement.', 503);

  const { data, error } = await supabaseAdmin
    .from('seller_cma_private_details')
    .insert({
      lead_id: scope.leadId,
      agent_id: scope.agentId,
      owner_user_id: scope.ownerId,
      property_address: parsed.data.propertyAddress,
      seller_permission_confirmed: true,
      consent_text_version: CONSENT_TEXT_VERSION,
    })
    .select('lead_id, consent_captured_at, expires_at')
    .single();

  if (error?.code === '23505') return privateError('Private CMA details already exist for this request. Remove them before recording a replacement.', 409);
  if (error || !data) return privateError('Private CMA details could not be saved.', 503);
  return privateJson({ ok: true, details: { leadId: data.lead_id, consentCapturedAt: data.consent_captured_at, expiresAt: data.expires_at } }, 201);
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const scope = await resolveOwnedCmaLead(request, context);
  if (scope instanceof Response) return scope;

  const sessionClient = createClient();
  const { data, error } = await sessionClient
    .from('seller_cma_private_details')
    .delete()
    .eq('lead_id', scope.leadId)
    .eq('owner_user_id', scope.ownerId)
    .select('lead_id');

  if (error) return privateError('Private CMA details could not be removed.', 503);
  if (!data?.length) return privateError('Private CMA details were not found.', 404);
  return privateJson({ ok: true, deleted: true });
}

async function resolveOwnedCmaLead(request: NextRequest, context: RouteContext) {
  const access = await requireOperatorRouteAccess(request);
  if (isAuthResponse(access)) return access;
  if (access.mode !== 'authenticated' || !access.user?.id) return privateError('Sign in with the owning account to access private CMA details.', 401);
  if (!permittedRoles.has(access.user.role)) return privateError('This account cannot access private CMA details.', 403);

  const { leadId: rawLeadId } = await context.params;
  const parsedLeadId = leadIdSchema.safeParse(rawLeadId);
  if (!parsedLeadId.success) return privateError('Lead not found.', 404);

  const { data: lead, error: leadError } = await supabaseAdmin
    .from('agent_site_leads')
    .select('id, agent_id, metadata')
    .eq('id', parsedLeadId.data)
    .eq('source', 'seller_plan')
    .maybeSingle();
  if (leadError) return privateError('Private CMA details are temporarily unavailable.', 503);
  if (!lead || (lead.metadata as Record<string, any> | null)?.sellerPlan?.requestKind !== 'pricing_review') return privateError('Lead not found.', 404);

  const { data: ownedSite, error: ownershipError } = await supabaseAdmin
    .from('site_config')
    .select('agent_id')
    .eq('agent_id', lead.agent_id)
    .eq('owner_id', access.user.id)
    .maybeSingle();
  if (ownershipError) return privateError('Private CMA details are temporarily unavailable.', 503);
  if (!ownedSite) return privateError('Lead not found.', 404);

  return { leadId: lead.id as string, agentId: lead.agent_id as string, ownerId: access.user.id };
}

function privateError(error: string, status: number) {
  return privateJson({ ok: false, error }, status);
}

function privateJson(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, { status, headers: { 'Cache-Control': 'private, no-store' } });
}
