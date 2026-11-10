import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SellerJourney } from '@/components/realtor/SellerJourney';
import { sellerCaseResultSchema } from '@/lib/realtor-workspace/sellerServiceContract';

const leadId = 'b73fd9d7-3483-4e28-a1ed-315617550cb7';
const messageId = '9f2b0636-7edc-49fb-8ec8-8fae82d240a1';
const bookingId = 'edc0d3bb-89c4-44d4-bb4d-23ad174e783b';

describe('seller journey rendering', () => {
  it('shows a scheduled consultation as planned and links the current next action', () => {
    const result = sellerCaseResultSchema.parse({
      case: null,
      lead: { id: leadId, name: 'Jordan Lee', email: 'jordan@example.test', revision: 1, status: 'new' },
      milestones: [],
      contactAllowed: true,
      milestoneRecords: [],
      events: [],
      messages: [{ id: messageId, direction: 'inbound', subject: 'Re: Selling', body: 'Let us talk.', status: 'recorded', occurred_at: '2026-10-19T15:00:00.000Z', provider_id: null }],
      hasMoreEvents: false,
      hasMoreMessages: false,
      bookings: [{ id: bookingId, start_time: '2026-10-22T15:00:00.000Z', end_time: '2026-10-22T15:30:00.000Z', status: 'accepted', linked: true }],
      timeZone: 'America/Chicago',
    });

    render(<SellerJourney result={result} />);

    const journey = screen.getByRole('region', { name: 'Seller relationship journey' });
    expect(journey).toHaveTextContent('Consultation scheduled');
    expect(journey).toHaveTextContent('Planned');
    expect(journey).toHaveTextContent('Consultation held');
    expect(screen.getByRole('link', { name: 'Record consultation' })).toHaveAttribute('href', `/seller-cases/${leadId}#case-milestones`);
    expect(Array.from(journey.querySelectorAll('time')).map((time) => time.getAttribute('datetime'))).toContain('2026-10-22T15:00:00.000Z');
    expect(journey).toHaveTextContent('Only saved conversations, appointments and milestones appear here.');
  });
});
