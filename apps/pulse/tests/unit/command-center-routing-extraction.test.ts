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

  it('extracts facts from portal shorthand with bd, ba, sf, HOA, and DOM fields', () => {
    const facts = extractListingFacts([
      '$612,500 | 5 bd | 4 ba | 3,102 sf',
      '9876 Bent Tree Ct Plano TX 75024',
      'MLS ID NTREIS-20881234',
      'Status Active DOM 12 HOA $95/mo',
      'Description: Light-filled home with remodeled kitchen, pool, covered patio, office, and three-car garage.',
    ].join('\n'));

    expect(facts).toEqual(expect.objectContaining({
      isListingLike: true,
      mlsId: 'NTREIS-20881234',
      price: '$612,500',
      beds: '5',
      baths: '4',
      sqft: '3,102',
      daysOnMarket: '12',
      hoaFee: '$95/mo',
    }));
    expect(facts.hooks).toEqual(expect.arrayContaining([
      'Updated interior and finish story',
      'Outdoor living angle',
      'Flexible space and practical storage',
    ]));
    expect(facts.confidence).toBeGreaterThanOrEqual(80);
  });

  it('extracts facts from JSON-style IDX payloads instead of dumping raw data into synthesis', () => {
    const facts = extractListingFacts(JSON.stringify({
      mlsNumber: 'RTC2788128',
      standardStatus: 'Active',
      listPrice: 520000,
      address: {
        streetNumber: '1408',
        streetName: 'Rosebank',
        streetSuffix: 'Ave',
        city: 'Nashville',
        state: 'TN',
        zip: '37206',
      },
      details: {
        description: 'Updated East Nashville home with open kitchen, covered patio, walk-in closets, and strong commute access.',
        style: 'Single Family Residence',
        numBedrooms: 3,
        numBathrooms: 2,
        sqft: '2028',
        yearBuilt: '2020',
        HOAFee: '225',
        flooringType: 'Carpet, Finished Wood, Tile',
      },
      daysOnMarket: 4,
      lot: { size: 0.11, measurement: 'Acres', features: 'Cul-De-Sac' },
      office: { brokerageName: 'Benchmark Realty, LLC' },
    }));

    expect(facts).toEqual(expect.objectContaining({
      isListingLike: true,
      mlsId: 'RTC2788128',
      address: '1408 Rosebank Ave, Nashville TN 37206',
      price: '$520,000',
      beds: '3',
      baths: '2',
      sqft: '2,028',
      lotSize: '0.11 acres',
      brokerage: 'Benchmark Realty, LLC',
    }));
    expect(formatListingFactsBrief(facts)).toContain('Likely hooks:');
    expect(formatListingFactsBrief(facts)).not.toContain('SAMPLE DATA');
  });

  it('returns validation warnings instead of pretending partial listing text is complete', () => {
    const facts = extractListingFacts([
      'Coming Soon',
      '2 beds 1 bath',
      'Public Remarks: Cute cottage near trails with new roof and fenced yard.',
      'Features: porch, storage shed',
    ].join('\n'));

    expect(facts.isListingLike).toBe(true);
    expect(facts.missingFields).toEqual(expect.arrayContaining(['address', 'price', 'sqft']));
    expect(facts.warnings.join(' ')).toContain('Address was not found');
    expect(facts.warnings.join(' ')).toContain('Price was not found');
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
