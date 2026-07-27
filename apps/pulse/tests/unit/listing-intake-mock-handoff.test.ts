import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const snapshot = {
  sourceCommand: 'Mock listing intake',
  approvedFacts: {
    address: '418 Cedar Ridge Drive',
    city: 'Fort Worth',
    state: 'TX',
    zip: '76107',
    price: '$485,000',
    beds: '3',
    baths: '2',
    sqft: '1,840',
    propertyType: 'Single Family',
    status: 'Active',
    remarks: 'Updated three-bedroom home with a covered patio and flexible office.',
    features: ['Covered patio', 'Two-car garage', 'Flexible office'],
  },
  drafts: {
    mls: 'MLS remarks',
    social: 'Social caption',
    buyer: 'Buyer note',
  },
  publishStatus: 'review' as const,
  warnings: [],
  missingFields: [],
};

beforeEach(async () => {
  vi.stubEnv('NEXT_PUBLIC_MOCK_MODE', 'true');
  const { resetMockListingIntakesForTests } = await import('@/lib/command-center/listingIntakeStore');
  const { resetMockCanonicalPropertiesForTests } = await import('@/lib/mocks/canonicalProperties');
  resetMockListingIntakesForTests();
  resetMockCanonicalPropertiesForTests();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('listing intake mock canonical handoff', () => {
  it('persists a local intake and applies only selected canonical fields', async () => {
    const {
      createListingIntake,
      updateListingIntake,
    } = await import('@/lib/command-center/listingIntakeStore');
    const {
      applyListingIntakeToCanonicalProperty,
      compareListingIntakeToCanonicalProperty,
    } = await import('@/lib/command-center/listingIntakePropertyHandoff');
    const { readMockCanonicalProperty } = await import('@/lib/mocks/canonicalProperties');

    const created = await createListingIntake(snapshot, 'local-operator', 'tester');
    const ready = await updateListingIntake(
      created.intakeId,
      { ...snapshot, publishStatus: 'ready' },
      'local-operator',
      'tester',
      created.version,
    );
    expect(ready?.publishStatus).toBe('ready');

    const before = readMockCanonicalProperty('MOCK-FTW-418');
    const comparison = await compareListingIntakeToCanonicalProperty({
      intakeId: created.intakeId,
      ownerId: 'local-operator',
      propertyReference: 'MOCK-FTW-418',
    });
    expect(comparison?.differences.find((difference) => difference.field === 'price')?.differs).toBe(true);

    const result = await applyListingIntakeToCanonicalProperty({
      intakeId: created.intakeId,
      ownerId: 'local-operator',
      actor: 'tester',
      expectedIntakeVersion: ready!.version,
      propertyId: comparison!.property.id,
      expectedPropertyLastUpdated: comparison!.property.lastUpdated,
      fields: ['price'],
    });

    const after = readMockCanonicalProperty('MOCK-FTW-418');
    expect(before?.price).toBe(499000);
    expect(after?.price).toBe(485000);
    expect(after?.beds).toBe(before?.beds);
    expect(after?.description).toBe(before?.description);
    expect(after?.last_updated).not.toBe(before?.last_updated);
    expect(result?.intake.propertyApplications.at(-1)?.status).toBe('applied');
    expect(result?.differences.find((difference) => difference.field === 'price')?.differs).toBe(false);
  });
});
