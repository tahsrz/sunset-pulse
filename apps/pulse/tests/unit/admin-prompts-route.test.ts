import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const routeMocks = vi.hoisted(() => ({
  requireOperatorRouteAccess: vi.fn(),
  isAuthResponse: vi.fn(),
  getDefaultAgentId: vi.fn(() => 'agent-authoritative'),
  readPromptConfig: vi.fn(),
  savePromptConfig: vi.fn(),
}));

vi.mock('@/lib/core/routeAuth', () => ({
  requireOperatorRouteAccess: routeMocks.requireOperatorRouteAccess,
  isAuthResponse: routeMocks.isAuthResponse,
}));
vi.mock('@/lib/sites/agentConfig', () => ({
  getDefaultAgentId: routeMocks.getDefaultAgentId,
}));
vi.mock('@/lib/sites/promptConfigStore', () => ({
  PromptConfigStoreUnavailableError: class PromptConfigStoreUnavailableError extends Error {},
  readPromptConfig: routeMocks.readPromptConfig,
  savePromptConfig: routeMocks.savePromptConfig,
}));

import { GET, POST } from '@/app/api/admin/prompts/route';

describe('admin prompts route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    routeMocks.requireOperatorRouteAccess.mockResolvedValue({
      allowed: true,
      mode: 'local',
      reason: 'local operator',
    });
    routeMocks.isAuthResponse.mockImplementation((value) => value instanceof Response);
    routeMocks.readPromptConfig.mockResolvedValue({ jamieSystemPrompt: 'Stored prompt' });
    routeMocks.savePromptConfig.mockResolvedValue(['supabase', 'mongo']);
  });

  it('reads normalized prompts from the repository', async () => {
    const response = await GET(new NextRequest('http://localhost/api/admin/prompts'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.jamieSystemPrompt).toBe('Stored prompt');
    expect(routeMocks.readPromptConfig).toHaveBeenCalledWith('agent-authoritative');
  });

  it('writes validated prompts through the repository', async () => {
    const input = {
      jamieSystemPrompt: 'Updated prompt',
      abidanPrompts: { MARKET_SCOUT: 'Scout prompt' },
      modelMatrix: { primaryModel: 'model-one' },
      operationalSettings: { minJudges: 1 },
    };

    const response = await POST(request(input));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.savedStores).toEqual(['supabase', 'mongo']);
    expect(routeMocks.savePromptConfig).toHaveBeenCalledWith('agent-authoritative', input);
  });

  it('rejects unknown configuration fields before persistence', async () => {
    const response = await POST(request({
      jamieSystemPrompt: 'Updated prompt',
      abidanPrompts: {},
      modelMatrix: {},
      operationalSettings: {},
      agentId: 'browser-selected',
    }));

    expect(response.status).toBe(400);
    expect(routeMocks.savePromptConfig).not.toHaveBeenCalled();
  });
});

function request(body: Record<string, unknown>) {
  return new NextRequest('http://localhost/api/admin/prompts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}
