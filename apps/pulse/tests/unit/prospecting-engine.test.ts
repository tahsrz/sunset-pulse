import { describe, expect, it } from 'vitest';
import {
  buildDailyProspectingQueue,
  classifyProspectingCandidate,
} from '@/lib/lead-generation/prospectingEngine';

const asOf = new Date('2026-08-03T12:00:00.000Z');

describe('prospectingEngine', () => {
  it('prioritizes expired listings inside the 30-90 day restart window', () => {
    const candidate = classifyProspectingCandidate({
      asOf,
      listing: {
        listingId: 'expired-1',
        address: '100 Main St',
        status: 'Expired',
        statusChangeDate: '2026-06-20',
        originalListPrice: 300000,
        currentListPrice: 285000,
      },
    });

    expect(candidate.opportunities[0]?.vector).toBe('expired_restart');
    expect(candidate.opportunities[0]?.urgency).toBe('today');
    expect(candidate.priorityScore).toBeGreaterThanOrEqual(90);
  });

  it('classifies active listings over 45 DOM as stale inventory', () => {
    const candidate = classifyProspectingCandidate({
      asOf,
      listing: {
        listingId: 'stale-1',
        address: '200 Oak Dr',
        status: 'Active',
        daysOnMarket: 76,
      },
    });

    expect(candidate.opportunities.some((opportunity) => opportunity.vector === 'stale_dom')).toBe(true);
    expect(candidate.opportunities[0]?.reasons.join(' ')).toContain('76 days on market');
  });

  it('detects absentee owners when ownership address differs and hold period is five years or longer', () => {
    const candidate = classifyProspectingCandidate({
      asOf,
      listing: {
        listingId: 'absentee-1',
        address: '300 Pine Rd',
        status: 'Active',
        daysOnMarket: 10,
      },
      taxRecord: {
        propertyAddress: '300 Pine Road, Belton, TX',
        mailingAddress: '22 Investor Avenue, Austin, TX',
        lastSaleDate: '2018-01-15',
        ownerOccupied: false,
      },
    });

    expect(candidate.opportunities[0]?.vector).toBe('absentee_owner');
    expect(candidate.opportunities[0]?.nextAction).toContain('rental-property market evaluation');
  });

  it('sorts the daily queue by highest priority score', () => {
    const queue = buildDailyProspectingQueue([
      {
        asOf,
        listing: {
          listingId: 'open-house-1',
          address: '400 Preview Ln',
          status: 'Active',
          vacant: true,
          brokerageInventory: true,
        },
      },
      {
        asOf,
        listing: {
          listingId: 'expired-2',
          address: '500 Restart Ct',
          status: 'Withdrawn',
          statusChangeDate: '2026-06-25',
        },
      },
    ]);

    expect(queue).toHaveLength(2);
    expect(queue[0].listingId).toBe('expired-2');
  });
});
