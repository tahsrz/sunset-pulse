import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

vi.mock('@/lib/command-center/commandRouter', () => ({
  runCommandCenterCommand: vi.fn(),
}));

vi.mock('@/lib/command-center/relayTemplates', () => ({
  listTahRelayFormats: vi.fn(() => []),
  listTahRelayTemplates: vi.fn(() => []),
}));

vi.mock('@/lib/command-center/intentClassifier', () => ({
  classifyCommandIntent: vi.fn(() => ({
    intent: 'general_command',
    confidence: 70,
    reason: 'test',
    workerId: 'lead-scoring',
    requiresListingParse: false,
    requiresMemory: false,
    requiresAtlas: false,
  })),
}));

vi.mock('@/lib/core/operator_access', () => ({
  getOperatorAccess: vi.fn(() => ({ allowed: false, mode: 'denied', reason: 'test' })),
}));

vi.mock('@/lib/core/routeAuth', () => ({
  getRequestHostFromHeaders: vi.fn(() => 'localhost:3000'),
}));

vi.mock('@/lib/core/orchestrator_node', () => ({
  getOrchestratorSnapshot: vi.fn(),
}));

vi.mock('@/lib/core/orchestrator_commands', () => ({
  routeOrchestratorCommand: vi.fn(),
}));

vi.mock('@/lib/observability/langfuseTracing', () => ({
  flushLangfuse: vi.fn(),
}));

vi.mock('@/lib/agents/voltagentCommandAdvisor', () => ({
  runVoltagentCommandAdvisor: vi.fn(),
}));

vi.mock('@/lib/tensorzero/commandEvaluation', () => ({
  recordTensorZeroCommandEvaluation: vi.fn(),
}));

vi.mock('@/lib/command-center/workflowReliability', () => ({
  runWorkflowOperation: vi.fn(),
  summarizeWorkflowAttempts: vi.fn(() => ({ attempts: [] })),
}));

import { POST } from '@/app/api/commands/route';
import { runCommandCenterCommand } from '@/lib/command-center/commandRouter';

describe('command route contract', () => {
  it('returns a bad request for malformed JSON', async () => {
    const response = await POST(new Request('http://localhost/api/commands', {
      method: 'POST',
      body: '{broken',
      headers: { 'content-type': 'application/json' },
    }));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe('Invalid JSON command request.');
    expect(runCommandCenterCommand).not.toHaveBeenCalled();
  });
});
