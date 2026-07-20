export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { publicGuideDispositionIdSchema } from '@/lib/ai/publicGuideConversionContract';
import { isAuthResponse, operatorAuditUser, requireOperatorRouteAccess } from '@/lib/core/routeAuth';
import { supabaseAdmin } from '@/lib/supabase';

const leadIdSchema = z.string().uuid();
const updateLeadSchema = z.discriminatedUnion('action', [
  z.object({ id: leadIdSchema, action: z.enum(['review', 'archive', 'restore']) }).strict(),
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
  const note = action === 'note' ? parsed.data.note : undefined;
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

  const update = buildLeadUpdate(action, now, note, existing?.status);

  const metadata = {
    ...((existing?.metadata || {}) as Record<string, unknown>),
    lastOperatorAction: {
      action,
      at: now,
      by: auditUser,
    },
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
  action: z.infer<typeof updateLeadSchema>['action'],
  now: string,
  note?: string,
  existingStatus?: string | null,
) {
  if (action === 'review') {
    return {
      status: 'reviewed',
      reviewed_at: now,
      archived_at: null,
    };
  }

  if (action === 'archive') {
    return {
      status: 'archived',
      archived_at: now,
    };
  }

  if (action === 'restore') {
    return {
      status: 'new',
      archived_at: null,
    };
  }

  if (action === 'disposition') {
    return existingStatus === 'new' ? { status: 'reviewed', reviewed_at: now } : {};
  }

  return {
    internal_note: note || '',
  };
}

function warnDispositionEvent(error: unknown) {
  console.warn(
    '[JAMIE_PUBLIC_GUIDE_DISPOSITION_EVENT]',
    error instanceof Error ? error.name : 'ProviderError',
  );
}
