import { describe, expect, it } from 'vitest';
import { sellerCaseResultSchema } from '@/lib/realtor-workspace/sellerServiceContract';
import { deriveSellerJourney } from '@/lib/realtor-workspace/sellerJourney';

const leadId = 'b73fd9d7-3483-4e28-a1ed-315617550cb7';
const bookingId = 'edc0d3bb-89c4-44d4-bb4d-23ad174e783b';
const eventId = '9f2b0636-7edc-49fb-8ec8-8fae82d240a1';
const baseResult = () => sellerCaseResultSchema.parse({
  case: null,
  lead: { id: leadId, name: 'Jordan Lee', email: 'jordan@example.test', revision: 1, status: 'new' },
  milestones: [], contactAllowed: true, milestoneRecords: [], events: [], messages: [],
  hasMoreEvents: false, hasMoreMessages: false, bookings: [], timeZone: 'America/Chicago',
});

describe('seller relationship journey', () => {
  it('starts with the saved request and points to the existing inbox', () => {
    const steps = deriveSellerJourney(baseResult());
    expect(steps[0]).toMatchObject({ key: 'request', state: 'complete', evidence: 'recorded' });
    expect(steps[1]).toMatchObject({ key: 'conversation', state: 'current', action: { label: 'Review request', href: `/seller-inbox?leadId=${leadId}` } });
    expect(steps.slice(2).every((step) => step.state === 'upcoming')).toBe(true);
  });

  it('keeps an accepted appointment planned until a separate held milestone is recorded', () => {
    const result = baseResult();
    result.bookings.push({ id: bookingId, start_time: '2026-10-22T15:00:00.000Z', end_time: '2026-10-22T15:30:00.000Z', status: 'accepted', linked: true });
    result.messages.push({ id: eventId, direction: 'inbound', subject: 'Re: Selling', body: 'Let us talk.', status: 'recorded', occurred_at: '2026-10-19T15:00:00.000Z', provider_id: null });
    const steps = deriveSellerJourney(result);
    expect(steps.find((step) => step.key === 'consultation-scheduled')).toMatchObject({ state: 'complete', evidence: 'planned' });
    expect(steps.find((step) => step.key === 'consultation-held')).toMatchObject({ state: 'current', evidence: null, action: { label: 'Record consultation', href: `/seller-cases/${leadId}#case-milestones` } });
  });

  it('does not restore a retracted agreement from historical event details', () => {
    const result = baseResult();
    result.events.push({ id: eventId, kind: 'milestone', occurred_at: '2026-10-18T15:00:00.000Z', details: { milestone: 'listing_agreement_verified' } });
    result.events.push({ id: bookingId, kind: 'retract_milestone', occurred_at: '2026-10-19T15:00:00.000Z', details: { milestoneEventId: eventId, milestone: 'listing_agreement_verified', reason: 'Incorrect record' } });
    const steps = deriveSellerJourney(result);
    expect(steps.find((step) => step.key === 'agreement')).toMatchObject({ state: 'upcoming', evidence: null });
    expect(steps.find((step) => step.key === 'preparing')).toMatchObject({ state: 'upcoming', evidence: null });
  });

  it('requires saved outcome milestones before showing closing as complete', () => {
    const result = baseResult();
    result.lead.status = 'closed';
    result.messages.push({ id: eventId, direction: 'inbound', subject: 'Re: Selling', body: 'Let us talk.', status: 'recorded', occurred_at: '2026-10-19T15:00:00.000Z', provider_id: null });
    result.bookings.push({ id: bookingId, start_time: '2026-10-18T15:00:00.000Z', end_time: '2026-10-18T15:30:00.000Z', status: 'accepted', linked: true });
    result.milestones.push('listing_agreement_verified', 'preparing', 'published', 'showing', 'offer_received', 'under_contract');
    result.milestoneRecords.push(...result.milestones.map((milestone) => ({ eventId, milestone, evidence: 'Verified source record', occurredOn: '2026-10-18' })));
    result.events.push({ id: eventId, kind: 'closing_recorded', occurred_at: '2026-10-19T15:00:00.000Z', details: {} });
    const steps = deriveSellerJourney(result);
    expect(steps.find((step) => step.key === 'consultation-held')).toMatchObject({ state: 'unavailable', evidence: null });
    expect(steps.find((step) => step.key === 'closed')).toMatchObject({
      state: 'current', evidence: null,
      action: { label: 'Record actual closing', href: `/seller-inbox?leadId=${leadId}` },
    });
  });
});
