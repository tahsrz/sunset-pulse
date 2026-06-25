import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const { mockGetJamieResponse, mockExecuteJamieToolCalls } = vi.hoisted(() => ({
  mockGetJamieResponse: vi.fn(),
  mockExecuteJamieToolCalls: vi.fn(),
}));

vi.mock('@/lib/ai/jamie', () => ({
  getJamieResponse: mockGetJamieResponse,
}));

vi.mock('@/lib/ai/jamieTools', () => ({
  executeJamieToolCalls: mockExecuteJamieToolCalls,
  formatPropertySearchResult: vi.fn(() => 'Property cards rendered.'),
}));

import { runTensorZeroJamieChat } from '@/lib/tensorzero/jamieBackbone';

const originalEnv = { ...process.env };
let tempDir: string;

beforeEach(() => {
  vi.clearAllMocks();
  process.env = { ...originalEnv };
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'jamie-backbone-'));
  process.env.TENSORZERO_JAMIE_CHAT_PATH = path.join(tempDir, 'jamie-chat.tensorzero.jsonl');
  process.env.TENSORZERO_JAMIE_CHAT_DISABLED = 'false';
});

afterEach(() => {
  process.env = { ...originalEnv };
  fs.rmSync(tempDir, { recursive: true, force: true });
});

describe('Jamie TensorZero backbone', () => {
  it('records ordinary Jamie turns through the TensorZero backbone', async () => {
    mockGetJamieResponse.mockResolvedValue('Here is the clean answer.');

    const result = await runTensorZeroJamieChat({
      messages: [{ role: 'user', content: 'What should I do next?' }],
      memoryContext: { isReturning: true },
    });

    expect(result.body).toMatchObject({
      role: 'assistant',
      content: 'Here is the clean answer.',
      tensorzero: {
        framework: 'tensorzero',
        functionName: 'jamie_chat',
        backbone: {
          status: 'active_local_backbone',
          route: 'local_groq_direct',
        },
      },
    });
    expect(fs.readFileSync(process.env.TENSORZERO_JAMIE_CHAT_PATH!, 'utf8')).toContain('"functionName":"jamie_chat"');
  });

  it('executes tool calls and records tool-backed variants', async () => {
    mockGetJamieResponse.mockResolvedValue({
      role: 'assistant',
      content: 'Scanning listings now.',
      tool_calls: [{ id: 'call_1', function: { name: 'search_properties' } }],
    });
    mockExecuteJamieToolCalls.mockResolvedValue([
      { name: 'search_properties', output: { results: [{ id: 'listing-1' }] } },
    ]);

    const result = await runTensorZeroJamieChat({
      messages: [{ role: 'user', content: 'Find me Frisco homes.' }],
      propertyData: { city: 'Frisco' },
    });

    expect(result.body.content).toContain('Property cards rendered.');
    expect(result.body.tensorzero).toMatchObject({
      variantName: expect.stringContaining('tools'),
      backbone: { status: 'active_local_backbone' },
    });
    expect(result.body.tool_results).toHaveLength(1);
  });
});
