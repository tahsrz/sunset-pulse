import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const mocks = vi.hoisted(() => ({
  applyPublicApiRateLimit: vi.fn(),
  schedulePublicGuideEvent: vi.fn(),
}));

vi.mock('@/lib/core/publicApiRateLimit', () => ({ applyPublicApiRateLimit: mocks.applyPublicApiRateLimit }));
vi.mock('@/lib/ai/publicGuideTelemetry', () => ({ schedulePublicGuideEvent: mocks.schedulePublicGuideEvent }));

import { POST } from '@/app/api/jamie/guide/events/route';

beforeEach(() => {
  vi.clearAllMocks();
  mocks.applyPublicApiRateLimit.mockResolvedValue(null);
});

describe('Jamie public guide event route', () => {
  it('records a validated anonymous action on the Jamie host', async () => {
    const event = {
      actionId: 'view_listing',
      event: 'action_click',
      hasListingContext: true,
      sessionId: 'session-12345678',
    };
    const response = await POST(new Request('https://jamie.sunsetpulse.app/api/jamie/guide/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', host: 'jamie.sunsetpulse.app' },
      body: JSON.stringify(event),
    }));

    expect(response.status).toBe(204);
    expect(mocks.schedulePublicGuideEvent).toHaveBeenCalledWith(event);
  });

  it('rejects arbitrary event names, destinations, and extra visitor content', async () => {
    const response = await POST(new Request('https://jamie.sunsetpulse.app/api/jamie/guide/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', host: 'jamie.sunsetpulse.app' },
      body: JSON.stringify({
        actionId: 'https://untrusted.example',
        event: 'prompt_text',
        prompt: 'private visitor text',
        sessionId: 'session-12345678',
      }),
    }));

    expect(response.status).toBe(400);
    expect(mocks.schedulePublicGuideEvent).not.toHaveBeenCalled();
  });
});
