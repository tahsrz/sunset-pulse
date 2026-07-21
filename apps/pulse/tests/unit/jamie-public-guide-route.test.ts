import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const mocks = vi.hoisted(() => ({
  applyPublicApiRateLimit: vi.fn(),
  classifyPublicGuideIntent: vi.fn(),
  resolvePublicGuideContext: vi.fn(),
  runPublicJamieGuide: vi.fn(),
  schedulePublicGuideEvent: vi.fn(),
}));

vi.mock('@/lib/core/publicApiRateLimit', () => ({
  applyPublicApiRateLimit: mocks.applyPublicApiRateLimit,
}));

vi.mock('@/lib/ai/publicGuide', () => ({
  runPublicJamieGuide: mocks.runPublicJamieGuide,
}));

vi.mock('@/lib/ai/publicGuideContext', () => ({
  resolvePublicGuideContext: mocks.resolvePublicGuideContext,
}));

vi.mock('@/lib/ai/publicGuideTelemetry', () => ({
  classifyPublicGuideIntent: mocks.classifyPublicGuideIntent,
  schedulePublicGuideEvent: mocks.schedulePublicGuideEvent,
}));

import { POST } from '@/app/api/jamie/guide/route';

const validBody = {
  messages: [{
    id: 'message-1',
    role: 'user',
    parts: [{ type: 'text', text: 'What is Sunset Pulse?' }],
  }],
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.applyPublicApiRateLimit.mockResolvedValue(null);
  mocks.classifyPublicGuideIntent.mockReturnValue('product');
  mocks.resolvePublicGuideContext.mockResolvedValue(null);
  mocks.runPublicJamieGuide.mockResolvedValue({
    actions: [{
      description: 'Browse verified active listings.',
      href: 'https://sunsetpulse.app/properties',
      id: 'browse_homes',
      kind: 'link',
      label: 'Browse homes',
    }],
    content: 'Sunset Pulse is a local-first real estate intelligence platform.',
    listings: [],
    outcome: 'general_guidance',
    sources: [{ label: 'Jamie public guide', detail: 'Approved public product context.' }],
    usedListingData: false,
  });
});

describe('Jamie public guide route', () => {
  it('serves a UI message stream only on the Jamie first-party host', async () => {
    const response = await POST(new Request('https://jamie.sunsetpulse.app/api/jamie/guide', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', host: 'jamie.sunsetpulse.app' },
      body: JSON.stringify(validBody),
    }));
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('text/event-stream');
    expect(body).toContain('Sunset Pulse is a local-first real estate intelligence platform.');
    expect(body).toContain('data-actions');
    expect(body).toContain('data-sources');
    expect(mocks.runPublicJamieGuide).toHaveBeenCalledWith(validBody, {
      context: null,
      rootOrigin: 'https://sunsetpulse.app',
    });
    expect(mocks.schedulePublicGuideEvent).toHaveBeenCalledWith(expect.objectContaining({
      event: 'question_asked',
      intentCategory: 'product',
    }));
    expect(mocks.schedulePublicGuideEvent).toHaveBeenCalledWith(expect.objectContaining({
      event: 'guide_response',
      hasAgentContext: false,
      hasListingContext: false,
      outcome: 'general_guidance',
    }));
  });

  it('does not expose the guide endpoint on an agent tenant host', async () => {
    const response = await POST(new Request('https://taz.sunsetpulse.app/api/jamie/guide', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', host: 'taz.sunsetpulse.app' },
      body: JSON.stringify(validBody),
    }));

    expect(response.status).toBe(404);
    expect(mocks.runPublicJamieGuide).not.toHaveBeenCalled();
  });

  it('rejects client attempts to select an agent identity', async () => {
    const response = await POST(new Request('https://jamie.sunsetpulse.app/api/jamie/guide', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', host: 'jamie.sunsetpulse.app' },
      body: JSON.stringify({ ...validBody, agentId: 'another-agent' }),
    }));

    expect(response.status).toBe(400);
    expect(mocks.runPublicJamieGuide).not.toHaveBeenCalled();
  });

  it('normalizes malformed guide result collections before streaming data parts', async () => {
    mocks.runPublicJamieGuide.mockResolvedValueOnce({
      actions: { id: 'contact_agent' },
      content: 'I found the matching listing context.',
      listings: { id: 'listing-1' },
      outcome: 'listing_search',
      sources: { label: 'MLS' },
      usedListingData: true,
    });

    const response = await POST(new Request('https://jamie.sunsetpulse.app/api/jamie/guide', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', host: 'jamie.sunsetpulse.app' },
      body: JSON.stringify(validBody),
    }));
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(body).toContain('"properties":[]');
    expect(body).toContain('"items":[]');
    expect(body).not.toContain('data-actions');
  });
});
