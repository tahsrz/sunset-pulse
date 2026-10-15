import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  mockConnectDB,
  mockFindOne,
  mockSelect,
  mockLean,
  mockFindOneAndUpdate,
  mockShouldProcess,
  mockUpsertCanonicalListing,
} = vi.hoisted(() => ({
  mockConnectDB: vi.fn(),
  mockFindOne: vi.fn(),
  mockSelect: vi.fn(),
  mockLean: vi.fn(),
  mockFindOneAndUpdate: vi.fn(),
  mockShouldProcess: vi.fn(),
  mockUpsertCanonicalListing: vi.fn(),
}));

vi.mock('@/lib/core/database', () => ({ default: mockConnectDB }));
vi.mock('@/models/Property', () => ({ default: {
  findOne: mockFindOne,
  findOneAndUpdate: mockFindOneAndUpdate,
} }));
vi.mock('@/lib/core/gatekeeper', () => ({ gatekeeper: { shouldProcessListing: mockShouldProcess } }));
vi.mock('@/lib/data/listingRepository', () => ({ upsertCanonicalListing: mockUpsertCanonicalListing }));

import { syncPropertyToIntelligenceGrid } from '@/lib/intelligence/propertySync';

describe('MLS cached photo repair', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockShouldProcess.mockReturnValue(false);
    mockConnectDB.mockResolvedValue(undefined);
    mockFindOne.mockReturnValue({ select: mockSelect });
    mockSelect.mockReturnValue({ lean: mockLean });
    mockLean.mockResolvedValue({ images: ['/images/property-placeholder.svg'] });
    mockFindOneAndUpdate.mockResolvedValue({});
    mockUpsertCanonicalListing.mockResolvedValue({ id: 'canonical-listing' });
  });

  it('refreshes unchanged cached MLS rows when they still have no provider photos', async () => {
    const incoming = {
      mls_id: 'MFRA4595929',
      last_updated: '2026-08-19T20:12:36.414Z',
      images: ['https://cdn.repliers.io/sample/IMG-MFRA4595929_0.jpg'],
    };

    const result = await syncPropertyToIntelligenceGrid(incoming);

    expect(result).toEqual({ id: 'canonical-listing' });
    expect(mockFindOne).toHaveBeenCalledWith({ mls_id: 'MFRA4595929' });
    expect(mockUpsertCanonicalListing).toHaveBeenCalledWith(incoming);
    expect(mockFindOneAndUpdate).toHaveBeenCalled();
  });

  it('continues skipping unchanged cached MLS rows that already have provider photos', async () => {
    mockLean.mockResolvedValue({ images: ['https://cdn.repliers.io/sample/existing.jpg'] });

    const result = await syncPropertyToIntelligenceGrid({
      mls_id: 'MFRA4595929',
      last_updated: '2026-08-19T20:12:36.414Z',
      images: ['https://cdn.repliers.io/sample/IMG-MFRA4595929_0.jpg'],
    });

    expect(result).toBeNull();
    expect(mockUpsertCanonicalListing).not.toHaveBeenCalled();
  });
});
