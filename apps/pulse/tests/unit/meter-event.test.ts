import { describe, expect, it } from 'vitest';
import { buildMeterEvent } from '@/lib/profit/meterEvent';
const event = { outcomeId: '11111111-1111-4111-8111-111111111111', tenantSite: 'agent-one.sunsetpulse.app', customerId: 'cus_1', outcomeType: 'property_tour_booked', amountUsd: 35, occurredAt: '2026-08-25T12:00:00.000Z', idempotencyKey: 'meter-event-property-tour-001' };
describe('LUNA-502 meter events', () => {
  it('refuses live submission before launch gates pass', () => expect(() => buildMeterEvent(event, {})).toThrow(/disabled/));
  it('builds a non-submitted payload after launch gates pass', () => expect(buildMeterEvent(event, { LUNA_LEGAL_APPROVED: 'true', LUNA_SHADOW_DECISION: 'launch' })).toMatchObject({ eventName: 'sunset_pulse_billable_outcome', submitted: false, payload: { amountUsd: 35, currency: 'USD' } }));
});
