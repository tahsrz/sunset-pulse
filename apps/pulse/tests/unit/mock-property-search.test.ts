import { describe, expect, it } from 'vitest';
import { filterMockSearchProperties, mockSearchProperties } from '@/lib/mocks/propertySearch';

describe('mock property search', () => {
  it('returns deterministic local listings without database access', () => {
    expect(mockSearchProperties).toHaveLength(3);
    expect(filterMockSearchProperties({})).toEqual(mockSearchProperties);
  });

  it('filters by location, facts, and price', () => {
    expect(filterMockSearchProperties({ location: 'arlington' }).map((property) => property.mls_id)).toEqual(['MOCK-ARL-905']);
    expect(filterMockSearchProperties({ beds: '3', maxPrice: '500000' }).map((property) => property.mls_id)).toEqual(['MOCK-FTW-418']);
    expect(filterMockSearchProperties({ amenities: 'pool' }).map((property) => property.mls_id)).toEqual(['MOCK-ARL-905']);
  });
});
