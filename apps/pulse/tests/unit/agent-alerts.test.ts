import { describe, expect, it } from 'vitest';
import { decideAgentAlertNotification, mergeIntelligenceEvents, processIntelligenceEvent } from '@/lib/intelligence/agentAlerts';

const BASE_EVENT = {
  id: '11111111-1111-4111-8111-111111111111',
  event_type: 'VISITOR_PROPERTY_VIEWED',
  actor_id: 'visitor:hashed',
  actor_name: 'Sunset_Pulse_Visitor',
  target_id: 'MLS-104',
  description: 'Visitor viewed a verified property.',
  metadata: {
    agentId: 'agent-one',
    leadId: '22222222-2222-4222-8222-222222222222',
    propertyIds: ['MLS-104'],
    leadIntelligence: {
      score: 86,
      inferredIntent: 'property_specific',
      reasons: [{ code: 'repeat_property_view', label: 'Returned to the same property', points: 10 }],
    },
  },
  severity: 'INFO',
  created_at: '2026-08-14T12:00:00.000Z',
};

describe('agent alert policy', () => {
  it('normalizes a production-shaped high-intent event', () => {
    const result = processIntelligenceEvent(BASE_EVENT, [], Date.parse(BASE_EVENT.created_at));
    expect(result.action).toBe('create');
    if (result.action !== 'create') return;
    expect(result.alert).toMatchObject({
      kind: 'high_intent_revisit',
      priority: 'high',
      leadId: BASE_EVENT.metadata.leadId,
      listingId: 'MLS-104',
    });
  });

  it('accepts the UTC offset timestamp shape returned by Supabase', () => {
    const event = { ...BASE_EVENT, created_at: '2026-08-14T12:00:00+00:00' };
    expect(processIntelligenceEvent(event, [], Date.parse(event.created_at)).action).toBe('create');
  });

  it('keeps malformed and unscoped events out of the operational queue', () => {
    expect(processIntelligenceEvent({ ...BASE_EVENT, id: 'not-a-uuid' }, []).action).toBe('error');
    expect(processIntelligenceEvent({ ...BASE_EVENT, metadata: { propertyIds: ['MLS-104'], leadIntelligence: { score: 90, reasons: [] } } }, []).action).toBe('ignore');
  });

  it('batches matching signals and deduplicates replayed event IDs', () => {
    const first = mergeIntelligenceEvents([], [BASE_EVENT]);
    const repeated = {
      ...BASE_EVENT,
      id: '33333333-3333-4333-8333-333333333333',
      created_at: '2026-08-14T12:05:00.000Z',
    };
    const merged = mergeIntelligenceEvents(first, [BASE_EVENT, repeated]);
    expect(merged).toHaveLength(1);
    expect(merged[0].occurrences).toBe(2);
    expect(merged[0].sourceEventId).toBe(repeated.id);
  });

  it('creates handoff alerts from their real uppercase event names', () => {
    const result = processIntelligenceEvent({
      ...BASE_EVENT,
      event_type: 'PUBLIC_GUIDE_HANDOFF_COMPLETED',
      target_id: BASE_EVENT.metadata.leadId,
      metadata: { agentId: 'agent-one' },
    }, []);
    expect(result.action).toBe('create');
    if (result.action === 'create') expect(result.alert.kind).toBe('new_lead');
  });

  it('notifies immediately for very high intent and batches warm activity', () => {
    const high = processIntelligenceEvent(BASE_EVENT, [], Date.parse(BASE_EVENT.created_at));
    expect(high.action).toBe('create');
    if (high.action !== 'create') return;
    const highDecision = decideAgentAlertNotification(high.alert, BASE_EVENT);
    expect(highDecision.action).toBe('enqueue');
    if (highDecision.action === 'enqueue') {
      expect(highDecision.idempotencyKey).toContain(`${BASE_EVENT.metadata.leadId}:high_intent_revisit`);
    }

    const warmEvent = {
      ...BASE_EVENT,
      metadata: {
        ...BASE_EVENT.metadata,
        leadIntelligence: { ...BASE_EVENT.metadata.leadIntelligence, score: 74 },
      },
    };
    const warm = processIntelligenceEvent(warmEvent, [], Date.parse(warmEvent.created_at));
    expect(warm.action).toBe('create');
    if (warm.action === 'create') {
      expect(decideAgentAlertNotification(warm.alert, warmEvent)).toMatchObject({ action: 'suppress' });
    }
  });

  it('suppresses existing lead email duplication and closed leads', () => {
    const handoffEvent = {
      ...BASE_EVENT,
      event_type: 'PUBLIC_GUIDE_HANDOFF_COMPLETED',
      target_id: BASE_EVENT.metadata.leadId,
      metadata: { ...BASE_EVENT.metadata, leadStatus: 'new' },
    };
    const handoff = processIntelligenceEvent(handoffEvent, []);
    expect(handoff.action).toBe('create');
    if (handoff.action === 'create') {
      expect(decideAgentAlertNotification(handoff.alert, handoffEvent)).toMatchObject({ action: 'suppress' });
    }

    const closedEvent = { ...BASE_EVENT, metadata: { ...BASE_EVENT.metadata, leadStatus: 'closed' } };
    const closed = processIntelligenceEvent(closedEvent, []);
    if (closed.action === 'create') {
      expect(decideAgentAlertNotification(closed.alert, closedEvent)).toMatchObject({ action: 'suppress' });
    }
  });
});
