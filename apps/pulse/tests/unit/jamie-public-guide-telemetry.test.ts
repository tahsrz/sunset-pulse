import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const mocks = vi.hoisted(() => ({ rpc: vi.fn() }));

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { rpc: mocks.rpc } }));

import { recordPublicGuideEvent } from '@/lib/ai/publicGuideTelemetry';

beforeEach(() => {
  vi.clearAllMocks();
  mocks.rpc.mockResolvedValue({ error: null });
});

describe('Jamie public guide telemetry', () => {
  it('stores a hashed session and fixed evaluation fields without visitor content', async () => {
    await recordPublicGuideEvent({
      event: 'guide_response',
      sessionId: 'browser-session-123',
      durationMs: 180_000,
      hasAgentContext: true,
      hasListingContext: true,
      outcome: 'context_fact',
      usedListingData: true,
    });

    expect(mocks.rpc).toHaveBeenCalledWith('log_intelligence_event', expect.objectContaining({
      p_actor_id: expect.stringMatching(/^public:[a-f0-9]{20}$/),
      p_description: 'Jamie public guide event: guide_response.',
      p_target_id: 'context_fact',
      p_metadata: {
        actionId: null,
        durationMs: 120_000,
        hasAgentContext: true,
        hasListingContext: true,
        outcome: 'context_fact',
        usedListingData: true,
      },
    }));
    expect(JSON.stringify(mocks.rpc.mock.calls[0][1])).not.toContain('browser-session-123');
  });
});
