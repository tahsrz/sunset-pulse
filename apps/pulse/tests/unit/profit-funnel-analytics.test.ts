import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: {} }));

import { buildProfitFunnelAnalytics } from '@/lib/profit/profitFunnelAnalytics';

describe('profit funnel analytics', () => {
  it('builds revenue-oriented funnel and delivery metrics without exposing event payloads', () => {
    const analytics = buildProfitFunnelAnalytics(
      [
        event('open', 'PUBLIC_GUIDE_GUIDE_OPENED', 'session-1'),
        event('response', 'PUBLIC_GUIDE_GUIDE_RESPONSE', 'session-1', { usage: { totalTokens: 1000 } }),
        event('handoff', 'PUBLIC_GUIDE_HANDOFF_OFFERED', 'session-1'),
        event('completed', 'PUBLIC_GUIDE_HANDOFF_COMPLETED', 'session-1'),
        event('tour', 'PUBLIC_GUIDE_TOUR_REQUESTED', 'session-1'),
        event('unanswered', 'PUBLIC_GUIDE_UNANSWERED_QUESTION', 'public:session-2', { intentCategory: 'listing_search' }),
        event('action', 'AGENT_LEAD_ACTION_OPENED', 'operator-1'),
      ],
      [
        { id: 'lead-1', funnel_id: '22222222-2222-4222-8222-222222222222', status: 'touring', source: 'jamie_public_guide', contact_attempted_at: '2026-08-24T10:01:00.000Z', responded_at: '2026-08-24T10:04:00.000Z', response_source: 'appointment_booked', estimated_pipeline_value: 12500, closed_revenue: null, value_currency: 'USD', value_source: 'operator_estimate', created_at: '2026-08-24T10:00:00.000Z', metadata: { rawInput: 'private' } },
        { id: 'lead-2', status: 'closed', source: 'agent_site_contact', estimated_pipeline_value: 15000, closed_revenue: 30000, value_currency: 'USD', value_source: 'closing_statement', created_at: '2026-08-24T10:00:00.000Z', metadata: null },
      ],
      [
        { id: 'delivery-1', funnel_id: '22222222-2222-4222-8222-222222222222', lead_id: 'lead-1', status: 'sent', provider: 'resend', cost_usd: 0.006, created_at: '2026-08-24T10:00:00.000Z', completed_at: '2026-08-24T10:00:08.000Z' },
        { id: 'delivery-2', lead_id: 'lead-2', status: 'failed', created_at: '2026-08-24T10:00:00.000Z', completed_at: null },
      ],
      [
        { id: 'notification-1', lead_id: 'lead-1', priority: 'high', read_at: '2026-08-24T10:01:00.000Z', created_at: '2026-08-24T10:00:00.000Z' },
        { id: 'notification-2', lead_id: 'lead-2', priority: 'high', read_at: null, created_at: '2026-08-24T10:00:00.000Z' },
      ],
      { modelPer1kTokens: 0.01, notificationPerDelivery: 0.02 },
      new Date('2026-08-24T12:00:00.000Z'),
    );

    expect(analytics.leads).toEqual(expect.objectContaining({ total: 2, jamieTotal: 1, estimatedPipelineValue: 42500, completedLeads: 1, closedLeads: 0, qualificationRate: 100 }));
    expect(analytics.leads.bySource).toEqual([
      { source: 'agent_site_contact', leads: 1, qualified: 1, closed: 1, estimatedPipelineValue: 30000, valuedLeads: 1 },
      { source: 'jamie_public_guide', leads: 1, qualified: 1, closed: 0, estimatedPipelineValue: 12500, valuedLeads: 1 },
    ]);
    expect(analytics.notifications).toEqual(expect.objectContaining({ total: 2, sent: 1, failed: 1, deliveryRate: 50, averageDeliverySeconds: 8, deliveryWithin60Seconds: 1, deliverySlaRate: 100, deliverySlaTarget: 90, hotTotal: 2, hotRead: 1, hotReadRate: 50, actionOpened: 1, costReceipts: 1, missingCostReceipts: 0 }));
    expect(analytics.acquisition).toEqual({ modelCost: 0.01, notificationCost: 0.006, costPerQualifiedLead: 0.016 });
    expect(analytics.identity).toEqual({ leadsLinked: 1, leadsTotal: 2, deliveriesLinked: 1, deliveriesTotal: 2 });
    expect(analytics.engagement).toEqual({ contacted: 1, responded: 1, appointments: 1, contactRate: 100, responseRate: 100, hotDelivered: 1, contactedWithin10Minutes: 1, contactSlaRate: 100, contactSlaTarget: 80, contactWindowScope: 'all_hours_pending_operating_hours_config' });
    expect(analytics.baseline).toEqual(expect.objectContaining({
      confidence: 'verified',
      metrics: expect.objectContaining({
        conversations: { value: 1, confidence: 'verified' },
        consentedHandoffs: { value: 1, confidence: 'verified' },
        appointments: { value: 1, confidence: 'verified' },
        revenue: { value: null, confidence: 'unknown' },
        totalVariableCost: { value: 0.016, confidence: 'verified' },
      }),
    }));
    expect(analytics.scopes.notificationOperations).toContain('tied to leads created during the window');
    expect(analytics.baselineReadiness).toEqual(expect.objectContaining({
      status: 'not_ready',
      decision: 'continue_baseline',
      blockers: expect.arrayContaining(['checkpoint_days', 'qualified_volume', 'closed_volume']),
    }));
    expect(analytics.baselineReadiness.criteria.find((criterion) => criterion.id === 'model_cost_coverage')).toMatchObject({ actual: 100, target: 95, met: true });
    expect(analytics.failureAudit).toEqual(expect.objectContaining({
      audited: 1,
      target: 20,
      transcriptStored: false,
      topLeaks: [expect.objectContaining({ category: 'retrieval', count: 1, owner: 'Jamie retrieval' })],
    }));
    expect(analytics.failureSignals).toEqual({ unansweredQuestions: 1, failedNotifications: 1, suppressedNotifications: 0 });
    expect(JSON.stringify(analytics)).not.toContain('private');
  });

  it('keeps missing value and cost data unknown', () => {
    const analytics = buildProfitFunnelAnalytics(
      [event('open', 'PUBLIC_GUIDE_GUIDE_OPENED', 'session-1', null)],
      [{ id: 'lead-1', status: 'new', source: 'jamie_public_guide', created_at: '2026-08-24T10:00:00.000Z', metadata: null }],
      [],
      [],
      { modelPer1kTokens: null, notificationPerDelivery: null },
      new Date('2026-08-24T12:00:00.000Z'),
    );

    expect(analytics.leads.estimatedPipelineValue).toBeNull();
    expect(analytics.acquisition).toEqual({ modelCost: null, notificationCost: 0, costPerQualifiedLead: null });
    expect(analytics.identity).toEqual({ leadsLinked: 0, leadsTotal: 1, deliveriesLinked: 0, deliveriesTotal: 0 });
    expect(analytics.engagement).toEqual({ contacted: 0, responded: 0, appointments: 0, contactRate: 0, responseRate: null, hotDelivered: 0, contactedWithin10Minutes: 0, contactSlaRate: null, contactSlaTarget: 80, contactWindowScope: 'all_hours_pending_operating_hours_config' });
    expect(analytics.baseline.confidence).toBe('partial');
    expect(analytics.baselineReadiness.status).toBe('not_ready');
    expect(analytics.baselineReadiness.blockers).toContain('model_cost_coverage');
  });

  it('allows margin experiments only when every readiness criterion passes', () => {
    const leads = Array.from({ length: 10 }, (_, index) => ({
      id: `lead-${index}`,
      funnel_id: `funnel-${index}`,
      status: index < 3 ? 'closed' : 'touring',
      source: 'jamie_public_guide',
      closed_revenue: index < 3 ? 10000 : null,
      created_at: '2026-08-24T10:00:00.000Z',
      metadata: null,
    }));
    const events = Array.from({ length: 10 }, (_, index) => event(`response-${index}`, 'PUBLIC_GUIDE_GUIDE_RESPONSE', `session-${index}`, { costUsd: 0.01 }));
    const deliveries = leads.map((lead, index) => ({
      id: `delivery-${index}`,
      funnel_id: lead.funnel_id,
      lead_id: lead.id,
      status: 'sent',
      cost_usd: 0.006,
      created_at: '2026-08-24T10:00:00.000Z',
      completed_at: '2026-08-24T10:00:08.000Z',
    }));

    const analytics = buildProfitFunnelAnalytics(
      events,
      leads,
      deliveries,
      [],
      { modelPer1kTokens: null, notificationPerDelivery: null },
      new Date('2026-08-24T12:00:00.000Z'),
      ['2026-08-18', '2026-08-19', '2026-08-20', '2026-08-21', '2026-08-22', '2026-08-23', '2026-08-24'],
    );

    expect(analytics.baselineReadiness.status).toBe('ready');
    expect(analytics.baselineReadiness.decision).toBe('start_margin_experiments');
    expect(analytics.baselineReadiness.blockers).toEqual([]);
    expect(analytics.baselineReadiness.criteria.every((criterion) => criterion.met)).toBe(true);
  });

  it('keeps margin experiments blocked when a daily checkpoint is missing', () => {
    const analytics = buildProfitFunnelAnalytics(
      [],
      [],
      [],
      [],
      { modelPer1kTokens: null, notificationPerDelivery: null },
      new Date('2026-08-24T12:00:00.000Z'),
      ['2026-08-18', '2026-08-19', '2026-08-20', '2026-08-22', '2026-08-23', '2026-08-24'],
    );

    expect(analytics.baselineReadiness.criteria.find((criterion) => criterion.id === 'checkpoint_days')).toMatchObject({ actual: 6, target: 7, met: false });
    expect(analytics.baselineReadiness.blockers).toContain('checkpoint_days');
  });
});

function event(id: string, event_type: string, actor_id: string, metadata: Record<string, unknown> | null = null) {
  return { id, event_type, actor_id, target_id: event_type === 'AGENT_LEAD_ACTION_OPENED' ? 'lead-1' : null, metadata, created_at: '2026-08-24T10:00:00.000Z' };
}
