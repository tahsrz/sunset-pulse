import 'server-only';

import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase';
import { throwRealtorRpcError, RealtorWorkspaceError } from './access.server';
import { sellerLeadActionSchema, sellerLeadPageSchema, sellerOutcomePageSchema, sellerOutcomePageResultSchema, sellerScheduleQuerySchema, sellerScheduleResultSchema } from './leadContracts';

const cursorSchema = z.object({
  actorId: z.string().uuid(),
  createdAt: z.string().datetime({ offset: true }),
  id: z.string().uuid(),
  limit: z.number().int().min(1).max(50),
  leadId: z.string().uuid().optional(),
}).strict();

export async function findOwnedSellerSchedule(actorId: string, workspaceId: string, rawQuery: unknown) {
  const query = sellerScheduleQuerySchema.parse(rawQuery);
  const { data, error } = await supabaseAdmin.rpc('seller_lead_read_planner_link', {
    p_actor_id: actorId, p_workspace_id: workspaceId, p_lead_id: query.leadId, p_action_key: query.actionKey,
  });
  if (error) throwRealtorRpcError(error.code);
  const result = sellerScheduleResultSchema.safeParse(data);
  if (!result.success) throw new RealtorWorkspaceError('FAILED');
  return result.data;
}

function decodeCursor(value: string | undefined, actorId: string, limit: number, leadId?: string) {
  if (!value) return null;
  try {
    const parsed = cursorSchema.parse(JSON.parse(Buffer.from(value, 'base64url').toString('utf8')));
    if (parsed.actorId !== actorId || parsed.limit !== limit || parsed.leadId !== leadId) {
      throw new Error('cursor context mismatch');
    }
    return parsed;
  } catch {
    throw new RealtorWorkspaceError('INVALID');
  }
}

export async function listOwnedSellerLeads(actorId: string, rawQuery: unknown) {
  const query = sellerLeadPageSchema.parse(rawQuery);
  const cursor = decodeCursor(query.cursor, actorId, query.limit, query.leadId);
  const { data, error } = await supabaseAdmin.rpc('seller_lead_list_owned', {
    p_actor_id: actorId,
    p_limit: query.limit + 1,
    p_before_created_at: cursor?.createdAt ?? null,
    p_before_id: cursor?.id ?? null,
    p_lead_id: query.leadId ?? null,
  });
  if (error) throwRealtorRpcError(error.code);

  const rows = Array.isArray(data) ? data : [];
  const hasMore = rows.length > query.limit;
  const leads = rows.slice(0, query.limit);
  const leadIds = leads.map((row) => String((row as { id?: string }).id || '')).filter(Boolean);
  let eventsByLead = new Map<string, Array<Record<string, unknown>>>();
  if (leadIds.length) {
    const { data: events, error: eventError } = await supabaseAdmin.rpc('seller_lead_read_recent_events', {
      p_actor_id: actorId, p_lead_ids: leadIds,
    });
    if (eventError) throw new RealtorWorkspaceError('FAILED');
    eventsByLead = new Map();
    for (const event of events || []) {
      const list = eventsByLead.get(String(event.lead_id)) || [];
      if (list.length < 20) list.push({ id: event.id, event_type: event.event_type, lead_revision: event.lead_revision, occurred_at: event.occurred_at, details: event.details });
      eventsByLead.set(String(event.lead_id), list);
    }
  }
  const leadsWithEvents = leads.map((row) => ({
    ...(row as Record<string, unknown>),
    sellerOutcomeEvents: eventsByLead.get(String((row as { id?: string }).id)) || [],
  }));
  const last = leads.at(-1) as { created_at?: string; id?: string } | undefined;
  const nextCursor = hasMore && last?.created_at && last.id
    ? Buffer.from(JSON.stringify({
      actorId, createdAt: last.created_at, id: last.id, limit: query.limit,
      ...(query.leadId ? { leadId: query.leadId } : {}),
    })).toString('base64url')
    : null;
  return { leads: leadsWithEvents, nextCursor };
}

export async function recordOwnedSellerLeadAction(actorId: string, rawAction: unknown) {
  const action = sellerLeadActionSchema.parse(rawAction);
  const { data, error } = await supabaseAdmin.rpc('seller_lead_record_action', {
    p_actor_id: actorId,
    p_input: action,
  });
  if (error) throwRealtorRpcError(error.code);
  return data;
}

const outcomeCursorSchema = cursorSchema.extend({
  leadId: z.string().uuid(),
  kind: sellerOutcomePageSchema.shape.kind,
});

export async function listOwnedSellerOutcomes(actorId: string, rawQuery: unknown) {
  const query = sellerOutcomePageSchema.parse(rawQuery);
  let cursor: z.infer<typeof outcomeCursorSchema> | null = null;
  if (query.cursor) {
    try {
      cursor = outcomeCursorSchema.parse(JSON.parse(Buffer.from(query.cursor, 'base64url').toString('utf8')));
      if (cursor.actorId !== actorId || cursor.leadId !== query.leadId
        || cursor.kind !== query.kind || cursor.limit !== query.limit) throw new Error('cursor context mismatch');
    } catch { throw new RealtorWorkspaceError('INVALID'); }
  }
  const { data, error } = await supabaseAdmin.rpc('seller_lead_list_active_outcomes', {
    p_actor_id: actorId, p_lead_id: query.leadId,
    p_event_type: query.kind === 'consultation' ? 'consultation_confirmed' : 'closing_recorded',
    p_limit: query.limit + 1, p_before_created_at: cursor?.createdAt ?? null, p_before_id: cursor?.id ?? null,
  });
  if (error) throwRealtorRpcError(error.code);
  const rows = Array.isArray(data) ? data : [];
  const events = sellerOutcomePageResultSchema.shape.events.parse(rows.slice(0, query.limit));
  const last = events.at(-1);
  const nextCursor = rows.length > query.limit && last
    ? Buffer.from(JSON.stringify({ actorId, leadId: query.leadId, kind: query.kind,
      limit: query.limit, createdAt: last.created_at, id: last.id })).toString('base64url') : null;
  return sellerOutcomePageResultSchema.parse({ events, nextCursor });
}
