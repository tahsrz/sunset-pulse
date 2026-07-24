import { describe, expect, it } from 'vitest';
import { classifyCommandIntent } from '@/lib/command-center/intentClassifier';
import { extractListingFacts, formatListingFactsBrief } from '@/lib/command-center/listingExtractor';

const listingFixture = [
  'MLS # 20654321',
  'Status: Active',
  'List Price: $485,000',
  '1234 Cedar Springs Dr, Dallas, TX 75204',
  'Single Family Residential',
  '4 beds 3 baths 2,418 sqft',
  'Year Built: 1998',
  'Lot Size: 0.21 acres',
  'Public Remarks: Updated home with open kitchen, mature trees, covered patio, and quick access to nearby shops.',
  'Features: hardwood floors, quartz counters, two-car garage, fenced backyard',
].join('\n');

describe('command center classifier and listing extraction', () => {
  it('extracts structured listing facts from pasted MLS-style text', () => {
    const facts = extractListingFacts(listingFixture);

    expect(facts).toEqual(expect.objectContaining({
      isListingLike: true,
      mlsId: '20654321',
      status: 'Active',
      price: '$485,000',
      beds: '4',
      baths: '3',
      sqft: '2,418',
      lotSize: '0.21 acres',
      yearBuilt: '1998',
    }));
    expect(facts.features).toEqual(expect.arrayContaining(['hardwood floors', 'quartz counters']));
    expect(formatListingFactsBrief(facts)).toContain('STRUCTURED_LISTING_FACTS');
  });

  it('routes pasted listings to listing analysis even when the remarks mention leads or follow-up', () => {
    const classification = classifyCommandIntent(`${listingFixture}\nFollow up with the buyer lead after you summarize it.`);

    expect(classification).toEqual(expect.objectContaining({
      intent: 'listing_analysis',
      workerId: 'listing-summary',
      requiresListingParse: true,
      requiresAtlas: true,
    }));
    expect(classification.confidence).toBeGreaterThanOrEqual(90);
  });

  it('keeps billing, architecture, and follow-up commands out of the generic fallback', () => {
    expect(classifyCommandIntent('Stripe checkout completed but subscription is past_due').intent).toBe('site_billing');
    expect(classifyCommandIntent('Explain the LangGraph workflow and retries').intent).toBe('system_architecture');
    expect(classifyCommandIntent('Write a warmer follow up text to the buyer').intent).toBe('lead_followup');
  });
});
