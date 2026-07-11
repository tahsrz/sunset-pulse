export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { isAuthResponse, operatorAuditUser, requireOperatorRouteAccess } from '@/lib/core/routeAuth';
import { supabaseAdmin } from '@/lib/supabase';

const updateLeadSchema = z.object({
  id: z.string().uuid(),
  action: z.enum(['review', 'archive', 'restore', 'note']),
  note: z.string().trim().max(2000).optional(),
});

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

  const { id, action, note } = parsed.data;
  const now = new Date().toISOString();
  const auditUser = operatorAuditUser(access);
  const update = buildLeadUpdate(action, now, note);

  const { data: existing, error: readError } = await supabaseAdmin
    .from('agent_site_leads')
    .select('metadata, internal_note')
    .eq('id', id)
    .single();

  if (readError) {
    return NextResponse.json({ ok: false, error: readError.message }, { status: 404 });
  }

  const metadata = {
    ...((existing?.metadata || {}) as Record<string, unknown>),
    lastOperatorAction: {
      action,
      at: now,
      by: auditUser,
    },
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

  return NextResponse.json({ ok: true, lead: data });
}

function buildLeadUpdate(action: z.infer<typeof updateLeadSchema>['action'], now: string, note?: string) {
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

  return {
    internal_note: note || '',
  };
}
