export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { publicGuideDispositionIdSchema } from '@/lib/ai/publicGuideConversionContract';
import { isAuthResponse, operatorAuditUser, requireOperatorRouteAccess } from '@/lib/core/routeAuth';
import { supabaseAdmin } from '@/lib/supabase';

const leadIdSchema = z.string().uuid();
const pipelineStatusSchema = z.enum(['new', 'contacted', 'touring', 'nurture', 'closed', 'archived']);

const updateLeadSchema = z.discriminatedUnion('action', [
  z.object({ id: leadIdSchema, action: z.enum(['review', 'archive', 'restore']) }).strict(),
  z.object({ id: leadIdSchema, action: z.literal('set_status'), status: pipelineStatusSchema }).strict(),
  z.object({ id: leadIdSchema, action: z.literal('note'), note: z.string().trim().max(2000).optional() }).strict(),
  z.object({
    id: leadIdSchema,
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

  const { id, action } = parsed.data;
  const now = new Date().toISOString();
  const auditUser = operatorAuditUser(access);

  const { data: existing, error: readError } = await supabaseAdmin
    .from('agent_site_leads')
    .select('metadata, internal_note, source, status')
    .eq('id', id)
    .single();

  if (readError) {
    return NextResponse.json({ ok: false, error: readError.message }, { status: 404 });
  }

  if (action === 'disposition' && existing?.source !== 'jamie_public_guide') {
    return NextResponse.json({ ok: false, error: 'Lead disposition is only available for Jamie handoffs.' }, { status: 400 });
  }

  const update = buildLeadUpdate(parsed.data, now, existing?.status);
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
    .select('id, status, internal_note, reviewed_at, archived_at, metadata')
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

  return NextResponse.json({ ok: true, lead: data });
}

function buildLeadUpdate(
  data: z.infer<typeof updateLeadSchema>,
  now: string,
  existingStatus?: string | null,
) {
  if (data.action === 'set_status') {
    return {
      status: data.status,
      ...(data.status === 'archived' ? { archived_at: now } : { archived_at: null }),
      ...(data.status !== 'new' && !existingStatus ? { reviewed_at: now } : {}),
    };
  }

  if (data.action === 'review') {
    return {
      status: 'contacted',
      reviewed_at: now,
      archived_at: null,
    };
  }

  if (data.action === 'archive') {
    return {
      status: 'archived',
      archived_at: now,
    };
  }

  if (data.action === 'restore') {
    return {
      status: 'new',
      archived_at: null,
    };
  }

  if (data.action === 'disposition') {
    return existingStatus === 'new' ? { status: 'contacted', reviewed_at: now } : {};
  }

  return {
    internal_note: data.note || '',
  };
}

function warnDispositionEvent(error: unknown) {
  console.warn(
    '[JAMIE_PUBLIC_GUIDE_DISPOSITION_EVENT]',
    error instanceof Error ? error.name : 'ProviderError',
  );
}
