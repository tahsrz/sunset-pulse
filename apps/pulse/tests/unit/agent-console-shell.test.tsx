import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import AgentConsole from '../../components/agent-console/AgentConsole';
import {
  savedExamplesStorageKey,
  type CommandResponse,
  type SavedExample,
} from '../../components/agent-console/agentConsoleConfig';

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

const savedFollowUp: SavedExample = {
  id: 'saved-follow-up',
  jobId: 'lead-follow-up',
  title: 'Follow up',
  input: 'Lead note',
  output: 'Follow up output',
  createdAt: '2026-07-28T00:00:00.000Z',
};

const savedListing: SavedExample = {
  id: 'saved-listing',
  jobId: 'listing-copy',
  title: 'Listing copy',
  input: 'Listing facts',
  output: 'Listing output',
  createdAt: '2026-07-28T00:01:00.000Z',
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

    fireEvent.click(screen.getByRole('button', { name: 'Run example' }));

    expect(await screen.findByRole('button', { name: 'Copy to send' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Full Command Center' })).toHaveAttribute('href', '/command-center');
  });

  it('runs the starter example from quick start with one click', async () => {
    const fetchMock = vi.fn().mockResolvedValue(streamResultResponse(commandResponse));
    vi.stubGlobal('fetch', fetchMock);

    render(<AgentConsole />);

    fireEvent.click(screen.getByRole('button', { name: 'Run example' }));

    expect(await screen.findByRole('button', { name: 'Copy to send' })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('button', { name: 'Run example' })).not.toBeInTheDocument();
    expect(screen.getByDisplayValue(/Buyer toured Oak Cliff bungalow/)).toBeInTheDocument();
  });

  it('scopes saved examples to the selected workflow', async () => {
    localStorage.setItem(savedExamplesStorageKey, JSON.stringify([savedListing, savedFollowUp]));

    render(<AgentConsole />);

    expect(await screen.findByText('Saved examples')).toBeInTheDocument();
    expect(screen.getByText('Lead note')).toBeInTheDocument();
    expect(screen.queryByText('Listing facts')).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Workflow'), { target: { value: 'listing-copy' } });

    expect(await screen.findByText('Listing facts')).toBeInTheDocument();
    expect(screen.queryByText('Lead note')).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Workflow'), { target: { value: 'objection-reply' } });

    await waitFor(() => expect(screen.queryByText('Saved examples')).not.toBeInTheDocument());
  });
});
