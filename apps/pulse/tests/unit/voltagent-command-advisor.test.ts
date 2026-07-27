import { afterEach, describe, expect, it, vi } from 'vitest';

const originalMockMode = process.env.NEXT_PUBLIC_MOCK_MODE;

afterEach(() => {
  vi.unstubAllEnvs();
  if (originalMockMode === undefined) delete process.env.NEXT_PUBLIC_MOCK_MODE;
  else process.env.NEXT_PUBLIC_MOCK_MODE = originalMockMode;
});

describe('VoltAgent command advisor', () => {
  it('stays local in mock mode even when a provider credential exists', async () => {
    vi.stubEnv('NEXT_PUBLIC_MOCK_MODE', 'true');
    vi.stubEnv('GROQ_API_KEY', 'configured-for-local-development');
    const { runVoltagentCommandAdvisor } = await import('@/lib/agents/voltagentCommandAdvisor');

    const result = await runVoltagentCommandAdvisor({
      request: {
        command: 'Summarize this listing.',
        selectedWorkerId: 'listing-summary',
      },
    });

    expect(result.status).toBe('standby');
    expect(result.reason).toContain('Mock mode is enabled');
    expect(result.text).toContain('Listing Summary');
  });
});
