import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const mocks = vi.hoisted(() => ({
  applyPublicApiRateLimit: vi.fn(),
  scheduleAgentConsoleEvent: vi.fn(),
}));

vi.mock('@/lib/core/publicApiRateLimit', () => ({
  applyPublicApiRateLimit: mocks.applyPublicApiRateLimit,
}));

vi.mock('@/lib/agent-console/telemetry', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/agent-console/telemetry')>();
  return {
    ...actual,
    scheduleAgentConsoleEvent: mocks.scheduleAgentConsoleEvent,
  };
});

import { POST } from '@/app/api/agent-console/events/route';

beforeEach(() => {
  vi.clearAllMocks();
  mocks.applyPublicApiRateLimit.mockResolvedValue(null);
});

describe('agent console events route', () => {
  it('rejects malformed JSON before scheduling telemetry', async () => {
    const response = await POST(new Request('http://localhost/api/agent-console/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{bad',
    }));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.message).toBe('A valid JSON request body is required.');
    expect(mocks.scheduleAgentConsoleEvent).not.toHaveBeenCalled();
  });

  it('schedules valid conversion events', async () => {
    const payload = {
      event: 'run_submitted',
      hasInput: true,
      inputLength: 72,
      jobId: 'lead-follow-up',
      savedExampleCount: 1,
      sessionId: 'agent-session-123',
      workerId: 'follow-up-writer',
    };

    const response = await POST(new Request('http://localhost/api/agent-console/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }));

    expect(response.status).toBe(204);
    expect(mocks.applyPublicApiRateLimit).toHaveBeenCalledWith(
      expect.any(Request),
      'agent-console-event',
      60,
    );
    expect(mocks.scheduleAgentConsoleEvent).toHaveBeenCalledWith(payload);
  });

  it('rejects unknown event names', async () => {
    const response = await POST(new Request('http://localhost/api/agent-console/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'mystery_click',
        sessionId: 'agent-session-123',
      }),
    }));

    expect(response.status).toBe(400);
    expect(mocks.scheduleAgentConsoleEvent).not.toHaveBeenCalled();
  });
});
