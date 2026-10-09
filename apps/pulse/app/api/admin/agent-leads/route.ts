export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { publicGuideDispositionIdSchema } from '@/lib/ai/publicGuideConversionContract';
import { isAuthResponse, operatorAuditUser, requireOperatorRouteAccess } from '@/lib/core/routeAuth';
import { resolveOperatorAgentId } from '@/lib/intelligence/agentNotificationStore';
import { AgentLeadActionError, applyAgentLeadAction } from '@/lib/sites/agentLeadActions.server';
import { supabaseAdmin } from '@/lib/supabase';

const leadIdSchema = z.string().uuid();
const requestKeySchema = z.string().uuid();
const pipelineStatusSchema = z.enum(['new', 'contacted', 'touring', 'nurture', 'closed', 'archived']);
const valueSourceSchema = z.enum(['operator_estimate', 'crm', 'closing_statement']);

const updateLeadSchema = z.discriminatedUnion('action', [
  z.object({ id: leadIdSchema, expectedRevision: z.number().int().positive(), requestKey: requestKeySchema, action: z.enum(['review', 'archive', 'restore']) }).strict(),
  z.object({ id: leadIdSchema, expectedRevision: z.number().int().positive(), requestKey: requestKeySchema, action: z.literal('set_status'), status: pipelineStatusSchema }).strict(),
  z.object({ id: leadIdSchema, expectedRevision: z.number().int().positive(), requestKey: requestKeySchema, action: z.literal('record_contact'), channel: z.enum(['call', 'email', 'sms']) }).strict(),
  z.object({ id: leadIdSchema, expectedRevision: z.number().int().positive(), requestKey: requestKeySchema, action: z.literal('record_response'), source: z.enum(['customer_reply', 'appointment_booked']) }).strict(),
  z.object({ id: leadIdSchema, expectedRevision: z.number().int().positive(), requestKey: requestKeySchema, action: z.literal('note'), note: z.string().trim().max(2000).optional() }).strict(),
  z.object({
    id: leadIdSchema,
    expectedRevision: z.number().int().positive(),
    requestKey: requestKeySchema,
    action: z.literal('set_value'),
    estimatedPipelineValue: z.number().finite().nonnegative().max(999999999999.99).nullable(),
    closedRevenue: z.number().finite().nonnegative().max(999999999999.99).nullable(),
    currency: z.literal('USD'),
    valueSource: valueSourceSchema,
  }).strict(),
  z.object({
    id: leadIdSchema,
    expectedRevision: z.number().int().positive(),
    requestKey: requestKeySchema,
    action: z.literal('disposition'),
    disposition: publicGuideDispositionIdSchema,
  }).strict(),
]);
export async function PATCH(request: NextRequest) {
  const access = await requireOperatorRouteAccess(request);
  if (isAuthResponse(access)) return access;

  const parsed = updateLeadSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: 'Invalid lead action.', details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }
  if (parsed.data.action === 'set_value' && parsed.data.estimatedPipelineValue === null && parsed.data.closedRevenue === null) {
    return NextResponse.json({ ok: false, error: 'At least one opportunity value is required.' }, { status: 400 });
  }

  const { id, action } = parsed.data;
  const scopedAgentId = access.user?.role === 'realtor'
    ? await resolveOperatorAgentId(access)
    : null;
  const auditUser = operatorAuditUser(access);

  const { data: existing, error: readError } = await supabaseAdmin
    .from('agent_site_leads')
    .select('agent_id, funnel_id, metadata, internal_note, source, status, revision')
    .eq('id', id)
    .single();

  if (readError) {
    return NextResponse.json({ ok: false, error: readError.message }, { status: 404 });
  }
  if (scopedAgentId && existing.agent_id !== scopedAgentId) {
    return NextResponse.json({ ok: false, error: 'Lead not found.' }, { status: 404 });
  }
  if (existing.source === 'seller_plan') {
    const { data: site } = await supabaseAdmin.from('site_config').select('owner_id,status')
      .eq('agent_id', existing.agent_id).maybeSingle();
    if (!access.user || site?.owner_id !== access.user.id || site.status !== 'active') {
      return NextResponse.json({ ok: false, error: 'Seller business actions are available to the current site owner.' }, { status: 403 });
    }
    if (action === 'set_status' && parsed.data.action === 'set_status' && parsed.data.status === 'closed') {
      return NextResponse.json({ ok: false, error: 'Record the actual seller closing date and transaction reference to close a seller request.' }, { status: 409 });
    }
  }
  if (action === 'disposition' && existing?.source !== 'jamie_public_guide') {
    return NextResponse.json({ ok: false, error: 'Lead disposition is only available for Jamie handoffs.' }, { status: 400 });
  }

  let result: { ok: true; replayed: boolean; lead: Record<string, unknown> };
  try {
    result = await applyAgentLeadAction(auditUser.userId, parsed.data, auditUser);
  } catch (error) {
    if (error instanceof AgentLeadActionError) {
      const status = error.code === 'P0002' ? 404
        : error.code === '42501' ? 403
          : error.code === '22023' || error.code === '22P02' ? 400
            : error.code === '40001' || error.code === '23505' ? 409 : 500;
      return NextResponse.json({ ok: false, error: status === 404 ? 'Lead not found.' : status === 403
        ? 'Seller business actions are available to the current site owner.'
        : status === 409 ? 'This lead changed or this action key was already used. Reload before saving.'
          : status === 400 ? 'Invalid lead action.' : 'Lead update failed.' }, { status });
    }
    console.warn('[AGENT_LEAD_ACTION]', error instanceof Error ? error.name : 'ProviderError');
    return NextResponse.json({ ok: false, error: 'Lead update failed.' }, { status: 500 });
  }

  if (!result.replayed && action === 'disposition') {
    try {
      const { error: eventError } = await supabaseAdmin.rpc('log_intelligence_event', {
        p_type: 'PUBLIC_GUIDE_LEAD_DISPOSITION',
        p_description: 'Jamie public guide lead disposition updated.',
        p_actor_id: auditUser.userId,
        p_actor_name: auditUser.name,
        p_target_id: id,
        p_metadata: { disposition: parsed.data.disposition },
        p_severity: 'INFO',
      });
      if (eventError) warnDispositionEvent(eventError);
    } catch (eventError) {
      warnDispositionEvent(eventError);
    }
  }

  if (!result.replayed && action === 'record_contact') {
    await logEngagementEvent({ id, auditUser, existing, type: 'contact', detail: parsed.data.channel });
  }
  if (!result.replayed && action === 'record_response') {
    await logEngagementEvent({ id, auditUser, existing, type: 'response', detail: parsed.data.source });
  }

  return NextResponse.json(result);
}

function warnDispositionEvent(error: unknown) {
  console.warn(
    '[JAMIE_PUBLIC_GUIDE_DISPOSITION_EVENT]',
    error instanceof Error ? error.name : 'ProviderError',
  );
}

async function logEngagementEvent(input: {
  id: string;
  auditUser: ReturnType<typeof operatorAuditUser>;
  existing: { agent_id: string; funnel_id?: string | null };
  type: 'contact' | 'response';
  detail: string;
}) {
  try {
    const isResponse = input.type === 'response';
    const { error } = await supabaseAdmin.rpc('log_intelligence_event', {
      p_type: isResponse ? 'LEAD_CUSTOMER_RESPONDED' : 'LEAD_CONTACT_ATTEMPTED',
      p_description: isResponse ? 'Customer response recorded by operator.' : 'Outbound contact attempt recorded by operator.',
      p_actor_id: input.auditUser.userId,
      p_actor_name: input.auditUser.name,
      p_target_id: input.id,
      p_metadata: {
        agentId: input.existing.agent_id,
        funnelId: input.existing.funnel_id || null,
        ...(isResponse ? { responseSource: input.detail } : { channel: input.detail }),
      },
      p_severity: 'INFO',
    });
    if (error) console.warn('[LEAD_ENGAGEMENT_EVENT]', error.message);
  } catch (error) {
    console.warn('[LEAD_ENGAGEMENT_EVENT]', error instanceof Error ? error.name : 'ProviderError');
  }
}
