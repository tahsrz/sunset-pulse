import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({ requireAccess: vi.fn(), retrieve: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('@/lib/core/routeAuth', () => ({
  requireOperatorRouteAccess: mocks.requireAccess,
  isAuthResponse: (value: unknown) => value instanceof Response,
}));
vi.mock('@/lib/ai/knowledgeRetrieval', () => ({
  retrieveKnowledge: mocks.retrieve,
}));

import { GET, POST } from '@/app/api/atlas/retrieval/route';

describe('Atlas retrieval inspector route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAccess.mockResolvedValue({ allowed: true, mode: 'authenticated' });
    mocks.retrieve.mockResolvedValue({
      query: 'What is a TAH cartridge?',
      crawlerStatus: 'healthy',
      evidence: [{ source: 'pulse.tah', title: 'TAH cartridge', excerpt: 'A binary knowledge cartridge.', url: null, score: 1 }],
      trace: { durationMs: 8, searchedCartridges: ['pulse.tah'], resultCount: 1 },
    });
  });

  it('lists the evaluation corpus for operators', async () => {
    const response = await GET(new NextRequest('https://example.test/api/atlas/retrieval'));
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.data.fixtures).toHaveLength(20);
  });

  it('runs a fixture through shared retrieval and returns its trace', async () => {
    const response = await POST(new NextRequest('https://example.test/api/atlas/retrieval', {
      method: 'POST',
      body: JSON.stringify({ fixtureId: 'retrieval-tah' }),
      headers: { 'Content-Type': 'application/json' },
    }));
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(mocks.retrieve).toHaveBeenCalledWith('What is a TAH cartridge in Sunset Pulse?');
    expect(body.data.trace.searchedCartridges).toEqual(['pulse.tah']);
    expect(body.data.evaluation.passed).toBe(true);
  });
});
