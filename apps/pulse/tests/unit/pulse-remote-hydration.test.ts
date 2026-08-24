import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  sync: vi.fn(async (query: string) => [`/tmp/${query}.tah`]),
}));

vi.mock('@/lib/ai/brain/remote_atlas', () => ({
  syncUniversalIntelligence: mocks.sync,
}));

beforeEach(async () => {
  vi.stubEnv('VERCEL', '1');
  vi.stubEnv('NEXT_PHASE', 'phase-production-server');
  mocks.sync.mockClear();
  const { clearPulseRemoteHydrationCacheForTests } = await import('@/lib/ai/brain/pulse_query');
  clearPulseRemoteHydrationCacheForTests();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('remote Atlas hydration cache', () => {
  it('deduplicates identical queries without starving unrelated queries', async () => {
    const { pulse_search_with_trace } = await import('@/lib/ai/brain/pulse_query');

    await pulse_search_with_trace('quantum mechanics', 1);
    await pulse_search_with_trace('quantum mechanics', 1);
    await pulse_search_with_trace('volcanic geology', 1);

    expect(mocks.sync).toHaveBeenCalledTimes(2);
    expect(mocks.sync).toHaveBeenNthCalledWith(1, 'quantum mechanics');
    expect(mocks.sync).toHaveBeenNthCalledWith(2, 'volcanic geology');
  });
});
