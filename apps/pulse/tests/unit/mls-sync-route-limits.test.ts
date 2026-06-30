import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const { mockSyncListings } = vi.hoisted(() => ({ mockSyncListings: vi.fn() }));

vi.mock('@/lib/core/routeAuth', () => ({
  requireOperatorRouteAccess: vi.fn().mockResolvedValue({ allowed: true, mode: 'authenticated' }),
  isAuthResponse: vi.fn(() => false),
}));
vi.mock('@/lib/data/mls', () => ({
  mlsService: {
    getSyncSnapshot: vi.fn(() => ({ recentRuns: [] })),
    syncListings: mockSyncListings,
    getActiveProviderName: vi.fn(() => 'bridge'),
  },
}));
vi.mock('@/lib/data/hotsheetMls', () => ({ importHotsheetText: vi.fn() }));

import { POST } from '@/app/api/admin/mls/sync/route';

describe('MLS sync route limits', () => {
  beforeEach(() => vi.clearAllMocks());

  it('rejects a declared oversized body before parsing it', async () => {
    const response = await POST(new NextRequest('http://example.test/api/admin/mls/sync', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'content-length': '700000' },
      body: '{}',
    }));
    expect(response.status).toBe(413);
    expect(mockSyncListings).not.toHaveBeenCalled();
  });

  it('rejects unknown provider filters and excessive page sizes', async () => {
    const response = await POST(new NextRequest('http://example.test/api/admin/mls/sync', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ params: { pageSize: 10000, $filter: 'anything' } }),
    }));
    expect(response.status).toBe(400);
    expect(mockSyncListings).not.toHaveBeenCalled();
  });
});
