import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: {} }));

import { buildAgentConsoleConversionAnalytics } from '@/lib/agent-console/analytics';

describe('Agent Console conversion analytics', () => {
  it('deduplicates sessions across the funnel and omits raw input data', () => {
    const events = [
      event('open-1', 'AGENT_CONSOLE_CONSOLE_OPENED', 'agent-console:session-1'),
      event('open-1-repeat', 'AGENT_CONSOLE_CONSOLE_OPENED', 'agent-console:session-1'),
      event('open-2', 'AGENT_CONSOLE_CONSOLE_OPENED', 'agent-console:session-2'),
      event('voice-1', 'AGENT_CONSOLE_VOICE_SAVED', 'agent-console:session-1'),
      event('example-1', 'AGENT_CONSOLE_EXAMPLE_LOADED', 'agent-console:session-1', {
        jobId: 'lead-follow-up',
        inputLength: 77,
        rawInput: 'this text must never appear in analytics output',
      }),
      event('submit-1', 'AGENT_CONSOLE_RUN_SUBMITTED', 'agent-console:session-1', { jobId: 'lead-follow-up' }),
      event('complete-1', 'AGENT_CONSOLE_RUN_COMPLETED', 'agent-console:session-1', { jobId: 'lead-follow-up' }),
      event('copy-1', 'AGENT_CONSOLE_RESULT_COPIED', 'agent-console:session-1', { jobId: 'lead-follow-up' }),
      event('submit-2', 'AGENT_CONSOLE_RUN_SUBMITTED', 'agent-console:session-2', { jobId: 'listing-copy' }),
      event('failed-2', 'AGENT_CONSOLE_RUN_FAILED', 'agent-console:session-2', { jobId: 'listing-copy' }),
    ];

    const analytics = buildAgentConsoleConversionAnalytics(events);

    expect(analytics.funnel.map((stage) => stage.sessions)).toEqual([2, 1, 1, 2, 1, 1]);
    expect(analytics.conversionRate).toBe(50);
    expect(analytics.completionRate).toBe(50);
    expect(analytics.reuseRate).toBe(100);
    expect(analytics.failedSessions).toBe(1);
    expect(analytics.jobs[0]).toEqual(expect.objectContaining({
      jobId: 'lead-follow-up',
      label: 'Follow Up',
      submittedSessions: 1,
      completedSessions: 1,
      reusedSessions: 1,
    }));
    expect(JSON.stringify(analytics)).not.toContain('this text must never appear');
    expect(JSON.stringify(analytics)).not.toContain('rawInput');
  });

  it('falls back to event ids when a session actor is unavailable', () => {
    const analytics = buildAgentConsoleConversionAnalytics([
      event('open-1', 'AGENT_CONSOLE_CONSOLE_OPENED', null),
      event('open-2', 'AGENT_CONSOLE_CONSOLE_OPENED', null),
    ]);

    expect(analytics.openedSessions).toBe(2);
    expect(analytics.conversionRate).toBe(0);
  });
});

function event(
  id: string,
  eventType: string,
  actorId: string | null,
  metadata: Record<string, unknown> = {},
) {
  return {
    id,
    event_type: eventType,
    actor_id: actorId,
    target_id: null,
    metadata,
    created_at: '2026-07-20T12:00:00.000Z',
  };
}
