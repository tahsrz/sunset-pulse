import 'server-only';

import type { AuthorizedOperator } from '@/lib/core/routeAuth';
import { agentNotificationSchema } from '@/lib/intelligence/agentNotificationContract';
import { supabaseAdmin } from '@/lib/supabase';
import { getDefaultAgentId, normalizeAgentId } from '@/lib/sites/agentConfig';

export async function resolveOperatorAgentId(access: AuthorizedOperator, requestedAgentId?: string) {
  const normalizedRequestedAgentId = normalizeAgentId(requestedAgentId);
  if (!access.user?.id) return normalizedRequestedAgentId || getDefaultAgentId();

  let query = supabaseAdmin
    .from('site_config')
    .select('agent_id')
    .eq('owner_id', access.user.id)
    .limit(1);

  if (normalizedRequestedAgentId) query = query.eq('agent_id', normalizedRequestedAgentId);
  const { data } = await query.maybeSingle();

  if (access.user.role === 'realtor' && !data?.agent_id) {
    throw new Error('No agent site is associated with this account.');
  }

  return normalizeAgentId(data?.agent_id) || normalizedRequestedAgentId || getDefaultAgentId();
}

export async function loadAgentNotifications(input: {
  agentId: string;
  before?: string;
  limit: number;
}) {
  let query = supabaseAdmin
    .from('agent_notifications')
    .select('id, source_event_id, agent_id, lead_id, listing_id, kind, priority, title, body, action_href, action_label, occurrences, read_at, archived_at, first_seen_at, last_seen_at, created_at')
    .eq('agent_id', input.agentId)
    .is('archived_at', null)
    .order('last_seen_at', { ascending: false })
    .limit(input.limit);

  if (input.before) query = query.lt('last_seen_at', input.before);
  const { data, error } = await query;
  if (error) throw new Error('Native notifications are temporarily unavailable.');

  const notifications = (data || []).flatMap((row) => {
    const parsed = agentNotificationSchema.safeParse(row);
    return parsed.success ? [parsed.data] : [];
  });
  const { count, error: countError } = await supabaseAdmin
    .from('agent_notifications')
    .select('id', { count: 'exact', head: true })
    .eq('agent_id', input.agentId)
    .is('archived_at', null)
    .is('read_at', null);
  if (countError) throw new Error('Unread notification count is temporarily unavailable.');

  return {
    notifications,
    unreadCount: count || 0,
    nextCursor: notifications.length === input.limit ? notifications.at(-1)?.last_seen_at || null : null,
  };
}

export async function mutateAgentNotifications(input: {
  agentId: string;
  action: 'mark_read' | 'mark_all_read' | 'archive';
  notificationId?: string;
}) {
  const now = new Date().toISOString();
  let query = supabaseAdmin.from('agent_notifications').update(
    input.action === 'archive' ? { archived_at: now, read_at: now } : { read_at: now },
  ).eq('agent_id', input.agentId);

  if (input.action === 'mark_all_read') query = query.is('archived_at', null).is('read_at', null);
  else query = query.eq('id', input.notificationId!);

  const { error } = await query;
  if (error) throw new Error('Notification update failed.');
}
