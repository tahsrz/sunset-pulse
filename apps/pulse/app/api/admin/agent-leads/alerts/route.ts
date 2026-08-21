import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { intelligenceEventSchema } from '@/lib/intelligence/agentAlerts';
import { enrichAgentAlertEvents } from '@/lib/intelligence/agentAlertContext';
import { isAuthResponse, requireOperatorRouteAccess } from '@/lib/core/routeAuth';
import { resolveOperatorAgentId } from '@/lib/intelligence/agentNotificationStore';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const querySchema = z.object({
  after: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
}).strict();

const ALERT_EVENT_TYPES = [
  'PUBLIC_GUIDE_HANDOFF_COMPLETED',
  'PUBLIC_GUIDE_HANDOFF_SUBMIT',
  'PUBLIC_GUIDE_TOUR_REQUESTED',
  'PUBLIC_GUIDE_LISTING_OPENED',
  'VISITOR_PROPERTY_VIEWED',
  'VISITOR_PROPERTIES_COMPARED',
];

export async function GET(request: NextRequest) {
  const access = await requireOperatorRouteAccess(request);
  if (isAuthResponse(access)) return access;

  const parsed = querySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: 'Invalid alert cursor.' }, { status: 400 });
  }

  const isCatchUp = Boolean(parsed.data.after);
  let query = supabaseAdmin
    .from('intelligence_events')
    .select('id, event_type, actor_id, actor_name, target_id, description, metadata, severity, created_at')
    .in('event_type', ALERT_EVENT_TYPES)
    .order('created_at', { ascending: isCatchUp })
    .limit(parsed.data.limit);

  if (access.user?.role === 'realtor') {
    const agentId = await resolveOperatorAgentId(access);
    query = query.filter('metadata->>agentId', 'eq', agentId);
  }

  if (parsed.data.after) query = query.gte('created_at', parsed.data.after);
  const { data, error } = await query;
  if (error) return NextResponse.json({ ok: false, error: 'Alert events are temporarily unavailable.' }, { status: 503 });

  const orderedEvents = isCatchUp ? (data || []) : [...(data || [])].reverse();
  const normalizedEvents = orderedEvents.flatMap((event) => {
    const result = intelligenceEventSchema.safeParse(event);
    return result.success ? [result.data] : [];
  });
  const events = await enrichAgentAlertEvents(normalizedEvents);

  return NextResponse.json({
    ok: true,
    events,
    cursor: events.at(-1)?.created_at || parsed.data.after || null,
  });
}
