export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { publicGuideDispositionIdSchema } from '@/lib/ai/publicGuideConversionContract';
import { isAuthResponse, operatorAuditUser, requireOperatorRouteAccess } from '@/lib/core/routeAuth';
import { resolveOperatorAgentId } from '@/lib/intelligence/agentNotificationStore';
import { supabaseAdmin } from '@/lib/supabase';

const leadIdSchema = z.string().uuid();
const pipelineStatusSchema = z.enum(['new', 'contacted', 'touring', 'nurture', 'closed', 'archived']);
const valueSourceSchema = z.enum(['operator_estimate', 'crm', 'closing_statement']);

const updateLeadSchema = z.discriminatedUnion('action', [
  z.object({ id: leadIdSchema, action: z.enum(['review', 'archive', 'restore']) }).strict(),
  z.object({ id: leadIdSchema, action: z.literal('set_status'), status: pipelineStatusSchema }).strict(),
  z.object({ id: leadIdSchema, action: z.literal('record_contact'), channel: z.enum(['call', 'email', 'sms']) }).strict(),
  z.object({ id: leadIdSchema, action: z.literal('record_response'), source: z.enum(['customer_reply', 'appointment_booked']) }).strict(),
  z.object({ id: leadIdSchema, action: z.literal('note'), note: z.string().trim().max(2000).optional() }).strict(),
  z.object({
    id: leadIdSchema,
    action: z.literal('set_value'),
    estimatedPipelineValue: z.number().finite().nonnegative().max(999999999999.99).nullable(),
    closedRevenue: z.number().finite().nonnegative().max(999999999999.99).nullable(),
    currency: z.literal('USD'),
    valueSource: valueSourceSchema,
  }).strict(),
  z.object({
    id: leadIdSchema,
    action: z.literal('disposition'),
    disposition: publicGuideDispositionIdSchema,
  }).strict(),
]);
type LeadUpdateAction = z.infer<typeof updateLeadSchema>;

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
  const now = new Date().toISOString();
  const auditUser = operatorAuditUser(access);

  const { data: existing, error: readError } = await supabaseAdmin
    .from('agent_site_leads')
    .select('agent_id, funnel_id, metadata, internal_note, source, status, estimated_pipeline_value, closed_revenue, value_currency, value_source')
    .eq('id', id)
    .single();

  if (readError) {
    return NextResponse.json({ ok: false, error: readError.message }, { status: 404 });
  }
  if (scopedAgentId && existing.agent_id !== scopedAgentId) {
    return NextResponse.json({ ok: false, error: 'Lead not found.' }, { status: 404 });
  }

  if (action === 'disposition' && existing?.source !== 'jamie_public_guide') {
    return NextResponse.json({ ok: false, error: 'Lead disposition is only available for Jamie handoffs.' }, { status: 400 });
  }

  const update = {
    ...buildLeadUpdate(parsed.data, now, existing?.status),
    ...(action === 'set_value' ? { valued_by: auditUser.email || auditUser.name || auditUser.userId } : {}),
    ...(action === 'record_contact' ? { contact_recorded_by: auditUser.email || auditUser.name || auditUser.userId } : {}),
    ...(action === 'record_response' ? { response_recorded_by: auditUser.email || auditUser.name || auditUser.userId } : {}),
  };
  const existingMetadata = ((existing?.metadata || {}) as Record<string, unknown>);
  const existingAuditTrail = Array.isArray(existingMetadata.auditTrail) ? existingMetadata.auditTrail : [];

  const auditEntry = {
    id: `audit-${Date.now()}`,
    action: action === 'set_status' ? `status_changed:${parsed.data.status}` : action,
    timestamp: now,
    actor: auditUser.email || auditUser.name || auditUser.userId || 'Operator',
    previousStatus: existing?.status || 'new',
    newStatus: update.status || existing?.status || 'new',
    note: action === 'note' ? parsed.data.note : undefined,
    valueSource: action === 'set_value' ? parsed.data.valueSource : undefined,
    channel: action === 'record_contact' ? parsed.data.channel : undefined,
    responseSource: action === 'record_response' ? parsed.data.source : undefined,
  };

  const metadata = {
    ...existingMetadata,
    lastOperatorAction: {
      action,
      at: now,
      by: auditUser,
    },
    auditTrail: [auditEntry, ...existingAuditTrail].slice(0, 30),
    ...(action === 'disposition' ? {
      publicGuideDisposition: {
        value: parsed.data.disposition,
        at: now,
        by: auditUser,
      },
    } : {}),
  };

  const { data, error } = await supabaseAdmin
    .from('agent_site_leads')
    .update({
      ...update,
      metadata,
    })
    .eq('id', id)
    .select('id, status, internal_note, reviewed_at, archived_at, contact_attempted_at, contact_channel, contact_recorded_by, responded_at, response_source, response_recorded_by, estimated_pipeline_value, closed_revenue, value_currency, value_source, valued_at, valued_by, metadata')
    .single();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  if (action === 'disposition') {
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

  if (action === 'record_contact') {
    await logEngagementEvent({ id, auditUser, existing, type: 'contact', detail: parsed.data.channel });
  }
  if (action === 'record_response') {
    await logEngagementEvent({ id, auditUser, existing, type: 'response', detail: parsed.data.source });
  }

  return NextResponse.json({ ok: true, lead: data });
}

function buildLeadUpdate(
  data: LeadUpdateAction,
  now: string,
  existingStatus?: string | null,
) {
  switch (data.action) {
    case 'set_status':
      return {
        status: data.status,
        ...(data.status === 'archived' ? { archived_at: now } : { archived_at: null }),
        ...(data.status !== 'new' && !existingStatus ? { reviewed_at: now } : {}),
      };
    case 'review':
      return {
        status: 'contacted',
        reviewed_at: now,
        archived_at: null,
      };
    case 'archive':
      return {
        status: 'archived',
        archived_at: now,
      };
    case 'restore':
      return {
        status: 'new',
        archived_at: null,
      };
    case 'disposition':
      return existingStatus === 'new' ? { status: 'contacted', reviewed_at: now } : {};
    case 'note':
      return {
        internal_note: data.note || '',
      };
    case 'record_contact':
      return {
        contact_attempted_at: now,
        contact_channel: data.channel,
        ...(existingStatus === 'new' ? { status: 'contacted', reviewed_at: now } : {}),
      };
    case 'record_response':
      return {
        responded_at: now,
        response_source: data.source,
        ...(data.source === 'appointment_booked' && existingStatus !== 'closed' ? { status: 'touring' } : {}),
      };
    case 'set_value':
      return {
        estimated_pipeline_value: data.estimatedPipelineValue,
        closed_revenue: data.closedRevenue,
        value_currency: data.currency,
        value_source: data.valueSource,
        valued_at: now,
      };
    default:
      return {};
  }
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
