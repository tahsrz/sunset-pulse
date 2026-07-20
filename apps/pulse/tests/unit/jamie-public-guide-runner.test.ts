import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const mocks = vi.hoisted(() => ({ generateText: vi.fn() }));

vi.mock('ai', () => ({
  generateText: mocks.generateText,
  stepCountIs: vi.fn(() => 'step-condition'),
}));
vi.mock('@ai-sdk/groq', () => ({ groq: vi.fn(() => 'groq-model') }));
vi.mock('@/lib/ai/jamieTools', () => ({
  jamieAiSdkTools: { search_properties: { description: 'search' } },
}));

import { runPublicJamieGuide } from '@/lib/ai/publicGuide';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Jamie public guide runner', () => {
  it('does not invoke a model or listing tool for approved product overviews', async () => {
    const result = await runPublicJamieGuide({
      messages: [{
        id: 'message-1',
        role: 'user',
        parts: [{ type: 'text', text: 'What is Sunset Pulse?' }],
      }],
    }, { rootOrigin: 'https://sunsetpulse.app' });

    expect(mocks.generateText).not.toHaveBeenCalled();
    expect(result.content).toContain('local-first real estate intelligence platform');
    expect(result.actions.map((action) => action.id)).toEqual(['browse_homes', 'explore_sunset_pulse']);
  });
});
