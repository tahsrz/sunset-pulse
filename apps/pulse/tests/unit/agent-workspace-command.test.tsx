import { describe, expect, it } from 'vitest';
import { AgentCommandLengthError, buildAgentCommand } from '@/lib/agent-workspace/buildAgentCommand';
import type { AgentSession } from '@/lib/agent-workspace/types';

const agent: AgentSession = { id: 'a', workerId: 'listing-summary', label: 'Listing Summary', assignment: 'Summarize verified listing facts', assignmentRevision: 1, autoListenEnabled: false, spawnedAtSequence: 0, draftText: '', draftDirty: false, draftRevision: 0, transcriptCursor: 0 };

describe('agent workspace command contract', () => {
  it('keeps worker assignment and visible submission in the bounded command', () => {
    const command = buildAgentCommand({ agent, text: 'Use exactly this text', transcript: [] });
    expect(command).toContain('Listing Summary');
    expect(command).toContain('Use exactly this text');
  });

  it('rejects oversized visible text instead of silently trimming it', () => {
    expect(() => buildAgentCommand({ agent, text: 'x'.repeat(20_001) })).toThrow(AgentCommandLengthError);
  });
});

