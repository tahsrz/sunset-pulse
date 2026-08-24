import 'server-only';

import { intelligenceEventSchema, type IntelligenceEvent } from '@/lib/intelligence/agentAlerts';
import { supabaseAdmin } from '@/lib/supabase';

type DeliveryStatus = 'pending' | 'processing' | 'sent' | 'failed' | 'suppressed';

export async function enrichAgentAlertEvents(events: readonly IntelligenceEvent[]): Promise<IntelligenceEvent[]> {
  if (!events.length) return [];
  const sessionHashes = new Set(events.flatMap((event) => {
    const match = event.actor_id?.match(/^public:(.+)$/);
    return match ? [match[1]] : [];
  }));
  const eventIds = events.map((event) => event.id);

  const [leadResult, deliveryResult] = await Promise.all([
    sessionHashes.size
      ? supabaseAdmin
        .from('agent_site_leads')
        .select('id, agent_id, name, listing_id, listing_mls_id, listing_name, metadata, status, created_at')
        .order('created_at', { ascending: false })
        .limit(250)
      : Promise.resolve({ data: [], error: null }),
    supabaseAdmin
      .from('notification_deliveries')
      .select('source_event_id, status, created_at')
      .in('source_event_id', eventIds)
      .order('created_at', { ascending: false }),
  ]);

  const leadsBySession = new Map<string, Record<string, unknown>>();
  if (!leadResult.error) {
    for (const lead of leadResult.data || []) {
      const metadata = isRecord(lead.metadata) ? lead.metadata : {};
      const guideContext = isRecord(metadata.publicGuideContext) ? metadata.publicGuideContext : {};
      const sessionHash = typeof guideContext.sessionIdHash === 'string' ? guideContext.sessionIdHash : '';
      if (!sessionHashes.has(sessionHash) || leadsBySession.has(sessionHash)) continue;
      leadsBySession.set(sessionHash, {
        agentId: lead.agent_id,
        funnelId: typeof metadata.funnelId === 'string' ? metadata.funnelId : null,
        leadId: lead.id,
        leadName: lead.name,
        leadStatus: lead.status,
        listingId: lead.listing_mls_id || lead.listing_id || null,
        listingName: lead.listing_name || null,
        leadIntelligence: metadata.leadIntelligence,
      });
    }
  }

  const deliveryByEvent = new Map<string, DeliveryStatus>();
  if (!deliveryResult.error) {
    for (const delivery of deliveryResult.data || []) {
      if (!deliveryByEvent.has(delivery.source_event_id)) {
        deliveryByEvent.set(delivery.source_event_id, delivery.status as DeliveryStatus);
      }
    }
  }

  return events.map((event) => {
    const sessionHash = event.actor_id?.match(/^public:(.+)$/)?.[1];
    const leadContext = sessionHash ? leadsBySession.get(sessionHash) : undefined;
    const notificationStatus = deliveryByEvent.get(event.id);
    if (!leadContext && !notificationStatus) return event;
    const enriched = intelligenceEventSchema.safeParse({
      ...event,
      metadata: {
        ...(event.metadata || {}),
        ...(leadContext || {}),
        ...(notificationStatus ? { notificationStatus } : {}),
      },
    });
    return enriched.success ? enriched.data : event;
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
