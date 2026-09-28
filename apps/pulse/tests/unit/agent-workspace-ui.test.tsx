import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AgentComposer } from '@/components/agent-workspace/AgentComposer';
import { AgentRail } from '@/components/agent-workspace/AgentRail';
import { SpawnAgentDialog } from '@/components/agent-workspace/SpawnAgentDialog';
import type { AgentSession } from '@/lib/agent-workspace/types';

const agent: AgentSession = { id: 'a', workerId: 'follow-up-writer', label: 'Follow-up Writer', assignment: 'Write follow-ups', assignmentRevision: 1, autoListenEnabled: true, spawnedAtSequence: 0, draftText: 'Exact visible text', draftDirty: true, draftRevision: 1, transcriptCursor: 0 };

describe('agent workspace UI', () => {
  it('submits the selected agent draft through the form', () => {
    const onSubmit = vi.fn();
    render(<AgentComposer agent={agent} busy={false} onChange={vi.fn()} onUseSpeech={vi.fn()} onSubmit={onSubmit} />);
    fireEvent.click(screen.getByRole('button', { name: /Submit now/ }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(screen.getByDisplayValue('Exact visible text')).toBeInTheDocument();
  });

  it('keeps rail selection separate from the listening toggle', () => {
    const onSelect = vi.fn();
    const onListenChange = vi.fn();
    render(<AgentRail agents={[agent]} selectedAgentId={null} runs={{}} onSelect={onSelect} onListenChange={onListenChange} onRemove={vi.fn()} onSpawn={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Select Follow-up Writer' }));
    fireEvent.click(screen.getByRole('button', { name: /Pause automatic listening/ }));
    expect(onSelect).toHaveBeenCalledWith('a');
    expect(onListenChange).toHaveBeenCalledWith('a', false);
  });

  it('does not request microphone access from the spawn dialog', () => {
    const onSpawn = vi.fn();
    render(<SpawnAgentDialog open workers={[]} onClose={vi.fn()} onSpawn={onSpawn} />);
    fireEvent.click(screen.getByRole('button', { name: 'Spawn agent' }));
    expect(onSpawn).toHaveBeenCalledWith(expect.objectContaining({ workerId: 'listing-summary', autoListenEnabled: false }));
  });
});
