import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  idleProgress,
  starterJobs,
  type CommandResponse,
} from '../../components/agent-console/agentConsoleConfig';
import { AgentConsoleOutputPanel } from '../../components/agent-console/AgentConsoleOutputPanel';

const result: CommandResponse = {
  commandId: 'cmd_output',
  worker: {
    id: 'follow-up-writer',
    name: 'Jamie Follow-Up Writer',
    role: 'Client follow-up',
  },
  result: {
    title: 'Follow-up',
    summary: 'A concise client follow-up.',
    actions: ['Send it today.'],
    confidence: 91,
    deliverable: {
      title: 'Oak Cliff follow-up',
      copyReadyText: 'Hi Morgan - want me to send easier commute options?',
      sourceSummary: 'Fixture',
    },
  },
};

function renderOutputPanel(overrides: Partial<React.ComponentProps<typeof AgentConsoleOutputPanel>> = {}) {
  return render(
    <AgentConsoleOutputPanel
      copied={false}
      error={null}
      onCopy={vi.fn()}
      onSave={vi.fn()}
      progress={idleProgress}
      result={null}
      running={false}
      saved={false}
      selectedJob={starterJobs[0]}
      {...overrides}
    />,
  );
}

describe('AgentConsoleOutputPanel', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('stays hidden before the first run starts', () => {
    const { container } = renderOutputPanel();

    expect(container.firstChild).toBeNull();
  });

  it('shows the generated result once Jamie finishes', () => {
    renderOutputPanel({ result });

    expect(screen.getByRole('button', { name: 'Copy to send' })).toBeInTheDocument();
    expect(screen.getByText(result.result.deliverable.copyReadyText)).toBeInTheDocument();
  });
});
