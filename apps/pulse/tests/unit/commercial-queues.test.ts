import { describe, expect, it } from 'vitest';
import { buildCommercialQueues, outcomeActionLabel, summarizeOutcomeEvidence } from '@/lib/agent-console/commercialQueues';

describe('LUNA-203 commercial queues', () => {
  it('separates appointment-ready and hot-uncontacted leads', () => {
    const leads = [{ id: 'lead-1', status: 'new', contact_attempted_at: null, funnel_id: 'funnel-1', responded_at: null }, { id: 'lead-2', status: 'new', contact_attempted_at: null, funnel_id: null, responded_at: '2026-08-25T12:00:00.000Z' }];
    const result = buildCommercialQueues(leads, [{ lead_id: 'lead-1', status: 'confirmed', appointment_type: 'buyer_consultation', start_time: '2026-08-26T15:00:00.000Z' }]);
    expect(result.appointmentReady).toHaveLength(1); expect(result.hotUncontacted).toHaveLength(2);
  });

  it('keeps missing evidence reviewable and summarizes recorded outcomes', () => {
    expect(summarizeOutcomeEvidence(null, 'confirmed')).toEqual({ detail: null, eligibility: 'Review outcome' });
    expect(summarizeOutcomeEvidence({ outcome_type: 'buyer_consultation_booked', billing_status: 'shadow', amount_usd: 20, evidence: { bookingId: 'booking-1' } }, 'confirmed')).toEqual({ detail: 'buyer consultation booked · $20 · 1 evidence fields', eligibility: 'shadow · outcome recorded' });
  });

  it('routes disputed and evidence gaps to explicit operator actions', () => {
    expect(outcomeActionLabel({ outcome_type: 'buyer_consultation_booked', billing_status: 'disputed', amount_usd: 20, evidence: { bookingId: 'booking-1' } }, 'completed')).toBe('Resolve dispute');
    expect(outcomeActionLabel({ outcome_type: 'buyer_consultation_booked', billing_status: 'shadow', amount_usd: 20, evidence: {} }, 'completed')).toBe('Add evidence');
  });
});
