import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/value-guess/listings/route';

const mocks = vi.hoisted(() => ({
  connectDB: vi.fn(),
  find: vi.fn()
}));

vi.mock('@/lib/core/database', () => ({
  default: mocks.connectDB
}));

vi.mock('@/models/Property', () => ({
  default: {
    find: mocks.find
  }
}));

describe('value guess listing feed route', () => {
  beforeEach(() => {
    mocks.connectDB.mockReset();
    mocks.find.mockReset();
  });

  it('returns normalized property-grid listings when eligible property records exist', async () => {
    mocks.connectDB.mockResolvedValue(undefined);
    mocks.find.mockReturnValue({
      sort: vi.fn().mockReturnValue({
        limit: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue([
            {
              _id: 'prop_route_1',
              name: 'Route Test Home',
              type: 'Single Family',
              source: 'MLS',
              location: { city: 'Plano', county: 'Collin' },
              list_price: 710000,
              price_type: 'sale',
              beds: 4,
              baths: 3,
              square_feet: 2600,
              images: ['https://images.example.com/plano.jpg'],
              agent_phone: 'hidden'
            }
          ])
        })
      })
    });

    const response = await GET(new NextRequest('http://localhost/api/value-guess/listings?limit=10'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.source).toBe('property-grid');
    expect(body.data.fallback).toBe(false);
    expect(body.data.listings).toHaveLength(1);
    expect(body.data.listings[0]).toEqual(expect.objectContaining({
      id: 'prop_route_1',
      title: 'Route Test Home',
      city: 'Plano',
      actualValue: 710000,
      source: 'MLS'
    }));
    expect(JSON.stringify(body.data.listings[0])).not.toContain('agent_phone');
  });

  it('falls back to curated cards when the property grid cannot be read', async () => {
    mocks.connectDB.mockRejectedValue(new Error('db offline'));

    const response = await GET(new NextRequest('http://localhost/api/value-guess/listings'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.source).toBe('curated-fallback');
    expect(body.data.fallback).toBe(true);
    expect(body.data.listings.length).toBeGreaterThan(0);
  });
});
