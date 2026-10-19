import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const { mockFind, mockConnectDB } = vi.hoisted(() => ({
  mockFind: vi.fn(),
  mockConnectDB: vi.fn(),
}));

vi.mock('@/lib/core/database', () => ({ default: mockConnectDB }));
vi.mock('@/models/Property', () => ({ default: { find: mockFind } }));
vi.mock('@/lib/data/pulse_sync_worker', () => ({
  pulseSyncWorker: { syncHotListings: vi.fn(), syncHistoricalSales: vi.fn() },
}));
vi.mock('@/lib/core/routeAuth', () => ({
  requireOperatorRouteAccess: vi.fn(),
  isAuthResponse: vi.fn(),
}));

import { GET } from '@/app/api/idx/hot-moving/route';

describe('homepage MLS feed', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockConnectDB.mockResolvedValue(undefined);
  });

  it('returns only MLS listings and supplies a safe image fallback', async () => {
    const candidates = [
      listing('remote', 'MLS', ['https://cdn.example.test/home.jpg']),
      listing('missing', 'MLS', [], 'bridge'),
      listing('broken-local', 'MLS', ['/sample/missing.jpg'], 'bridge'),
      listing('mixed-images', 'MLS', ['/sample/missing.jpg', 'https://cdn.example.test/actual.jpg'], 'repliers'),
      listing('internal', 'Internal', ['https://cdn.example.test/internal.jpg']),
      { ...listing('private', 'MLS', ['https://cdn.example.test/private.jpg']), display_public: false },
      { ...listing('seeded-sample', 'MLS', ['https://cdn.example.test/sample.jpg']), metadata: undefined, description: '**** SAMPLE DATA ****' },
    ];
    const lean = vi.fn().mockResolvedValue(candidates);
    const limit = vi.fn(() => ({ lean }));
    const sort = vi.fn(() => ({ limit }));
    mockFind.mockReturnValue({ sort });

    const response = await GET(new NextRequest('http://localhost/api/idx/hot-moving'));
    const body = await response.json();

    expect(mockFind).toHaveBeenCalledWith(expect.objectContaining({
      source: 'MLS',
      listing_status: 'Active',
      'metadata.provider': { $in: ['bridge', 'repliers'] },
    }));
    expect(body.data.listings).toHaveLength(4);
    expect(body.data.listings[0]._id).toBe('remote');
    expect(body.data.listings[0].images[0]).toBe('https://cdn.example.test/home.jpg');
    expect(body.data.listings[1].images).toEqual(['/images/property-placeholder.svg']);
    expect(body.data.listings[2].images).toEqual(['/images/property-placeholder.svg']);
    expect(body.data.listings[3].images).toEqual(['https://cdn.example.test/actual.jpg']);
    expect(body.data.listings.some((candidate: any) => candidate._id === 'private')).toBe(false);
    expect(body.data.listings.some((candidate: any) => candidate.source === 'Internal')).toBe(false);
    expect(body.data.listings.some((candidate: any) => candidate._id === 'seeded-sample')).toBe(false);
  });
});

function listing(id: string, source: string, images: string[], provider = 'bridge') {
  return { _id: id, source, images, metadata: { provider }, listing_status: 'Active', updatedAt: new Date().toISOString() };
}
