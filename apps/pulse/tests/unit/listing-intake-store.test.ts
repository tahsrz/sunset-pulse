import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import {
  createListingIntake,
  getListingIntakePublishBlockers,
  mockListingIntakeStorePath,
  readListingIntake,
  resetMockListingIntakesForTests
} from '@/lib/command-center/listingIntakeStore';

const previousMockMode = process.env.NEXT_PUBLIC_MOCK_MODE;
const previousMockPath = process.env.PULSE_MOCK_LISTING_INTAKE_PATH;

afterEach(() => {
  restoreEnv('NEXT_PUBLIC_MOCK_MODE', previousMockMode);
  restoreEnv('PULSE_MOCK_LISTING_INTAKE_PATH', previousMockPath);
  resetMockListingIntakesForTests();
});

describe('listing intake publish gate', () => {
  it('blocks ready status when parser validation is unresolved', () => {
    const blockers = getListingIntakePublishBlockers({
      sourceCommand: 'Listing details',
      approvedFacts: {},
      drafts: { mls: '', social: '', buyer: '' },
      publishStatus: 'ready',
      missingFields: ['price'],
      warnings: ['Address was not found; verify location before using public copy.'],
    });

    expect(blockers).toEqual([
      'Missing required field: price.',
      'Address was not found; verify location before using public copy.',
    ]);
  });

  it('allows a clean intake to move through review', () => {
    expect(getListingIntakePublishBlockers({
      sourceCommand: 'Listing details',
      approvedFacts: {},
      drafts: { mls: '', social: '', buyer: '' },
      publishStatus: 'review',
      missingFields: [],
      warnings: [],
    })).toEqual([]);
  });

  it('persists mock listing intakes across in-memory store resets', async () => {
    const filePath = path.join(os.tmpdir(), `pulse-listing-intakes-${Date.now()}.json`);
    process.env.NEXT_PUBLIC_MOCK_MODE = 'true';
    process.env.PULSE_MOCK_LISTING_INTAKE_PATH = filePath;
    resetMockListingIntakesForTests();

    const created = await createListingIntake({
      sourceCommand: 'Listing details',
      approvedFacts: { address: '418 Cedar Ridge Drive', price: '$485,000' },
      drafts: { mls: 'MLS copy', social: 'Social copy', buyer: 'Buyer copy' },
      publishStatus: 'review',
      missingFields: [],
      warnings: [],
    }, 'local-operator', 'tester');

    (globalThis as any).__sunsetPulseMockListingIntakes = undefined;

    expect(mockListingIntakeStorePath()).toBe(filePath);
    await expect(readListingIntake(created.intakeId, 'local-operator')).resolves.toEqual(expect.objectContaining({
      intakeId: created.intakeId,
      version: 1,
      approvedFacts: expect.objectContaining({ price: '$485,000' }),
    }));
  });
});

function restoreEnv(key: string, value: string | undefined) {
  if (value === undefined) {
    delete process.env[key];
  } else {
    process.env[key] = value;
  }
}
