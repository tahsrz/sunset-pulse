import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { connectDBMock, findMock } = vi.hoisted(() => ({
  connectDBMock: vi.fn(),
  findMock: vi.fn(),
}));

vi.mock('@/lib/core/database', () => ({ default: connectDBMock }));
vi.mock('@/models/Valuation', () => ({ default: { find: findMock } }));

import { GET, POST } from '@/app/api/valuation/route';

describe('valuation safety boundary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('NEXT_PUBLIC_MOCK_MODE', 'false');
  });

  afterEach(() => vi.unstubAllEnvs());

  it('only returns records explicitly opted into public sharing and selects display fields', async () => {
    const records = [{ _id: 'public-id', address: 'Public demo address', estimate: 1, location_geo: { coordinates: [0, 0] } }];
    const lean = vi.fn().mockResolvedValue(records);
    const select = vi.fn().mockReturnValue({ lean });
    findMock.mockReturnValue({ select });

    const response = await GET();

    expect(response.status).toBe(200);
    expect(findMock).toHaveBeenCalledWith({ status: 'Confirmed', publiclyShareable: true });
    expect(select).toHaveBeenCalledWith('_id address estimate location_geo createdAt');
    expect((await response.json()).data).toEqual(records);
  });

  it('does not estimate or confirm until licensed data and a reviewed workflow exist', async () => {
    const request = new NextRequest('http://localhost/api/valuation', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ address: 'Any address', confirm: true, id: 'legacy-draft-id' }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.code).toBe('VALUATION_UNAVAILABLE');
    expect(connectDBMock).not.toHaveBeenCalled();
    expect(findMock).not.toHaveBeenCalled();
  });
});
