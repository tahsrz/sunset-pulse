import { describe, expect, it } from 'vitest';
import {
  buildCanonicalListingPatch,
  buildListingIntakePropertyDiff,
} from '@/lib/command-center/listingIntakePropertyDiff';

const approvedFacts = {
  address: '123 Sunset Drive',
  city: 'Austin',
  state: 'TX',
  zip: '78704',
  price: '$499,000',
  beds: '3',
  baths: '2.5',
  sqft: '1,850',
  propertyType: 'Single Family',
  status: 'Active',
  remarks: 'Light-filled home with a flexible office.',
  features: ['Covered patio', 'Two-car garage'],
};

const canonicalProperty = {
  id: '272d9c7c-d461-45b2-82b0-77d13bfe7ffd',
  mls_id: 'MLS-12345',
  name: '123 Sunset Drive',
  type: 'Single Family',
  street: '123 Sunset Drive',
  city: 'Austin',
  state: 'TX',
  zip: '78704',
  price: 475000,
  beds: 3,
  baths: 2.5,
  sqft: 1850,
  listing_status: 'Active',
  description: 'Light-filled home with a flexible office.',
  amenities: ['Two-car garage', 'Covered patio'],
};

describe('listing intake canonical property diff', () => {
  it('only marks normalized values that differ', () => {
    const differences = buildListingIntakePropertyDiff(approvedFacts, canonicalProperty);
    const byField = Object.fromEntries(differences.map((difference) => [difference.field, difference]));

    expect(byField.price.differs).toBe(true);
    expect(byField.price.intakeValue).toBe('$499,000');
    expect(byField.price.canonicalValue).toBe('475000');
    expect(byField.features.differs).toBe(false);
    expect(byField.sqft.differs).toBe(false);
    expect(byField.address.differs).toBe(false);
  });

  it('builds a patch for selected fields only and normalizes numbers', () => {
    expect(buildCanonicalListingPatch(approvedFacts, ['price', 'features', 'status'])).toEqual({
      price: 499000,
      amenities: ['Covered patio', 'Two-car garage'],
      listing_status: 'Active',
    });
  });

  it('converts shorthand prices before writing a canonical row', () => {
    expect(buildCanonicalListingPatch({ price: '$1.5M' }, ['price'])).toEqual({ price: 1500000 });
  });
});
