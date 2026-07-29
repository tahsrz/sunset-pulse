import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import AgentConsole from '../../components/agent-console/AgentConsole';
import type { CommandResponse } from '../../components/agent-console/agentConsoleConfig';

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

vi.mock('../../components/agent-console/agentConsoleEvents', () => ({
  trackAgentConsoleEvent: vi.fn(),
}));

const commandResponse: CommandResponse = {
  commandId: 'cmd_shell',
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

function streamResultResponse(result: CommandResponse) {
  const encoder = new TextEncoder();
  return new Response(new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(`event: result\ndata: ${JSON.stringify(result)}\n\n`));
      controller.close();
    },
  }));
}

describe('AgentConsole shell', () => {
  afterEach(() => {
    cleanup();
    localStorage.clear();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('shows the Command Center exit only after Jamie returns a result', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(streamResultResponse(commandResponse)));

    render(<AgentConsole />);

    expect(screen.queryByRole('link', { name: 'Full Command Center' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Start with example' }));
    fireEvent.click(screen.getByRole('button', { name: 'Run Jamie' }));

    expect(await screen.findByRole('button', { name: 'Copy to send' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Full Command Center' })).toHaveAttribute('href', '/command-center');
  });
});
