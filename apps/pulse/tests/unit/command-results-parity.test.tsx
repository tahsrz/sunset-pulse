import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CommandSources } from '@/components/command-center/results/CommandSources';
import { CommandDetails } from '@/components/command-center/results/CommandDetails';
import { AgentResults } from '@/components/agent-workspace/AgentResults';
import type { AgentRun } from '@/lib/agent-workspace/types';
import type { CommandResponse } from '@/lib/command-center/commandTypes';

const response: CommandResponse = { commandId: 'command-1', commandText: 'Immutable command', intent: 'listing_analysis', worker: { id: 'listing-summary', name: 'Listing', role: 'Summary' }, result: { title: 'Title', summary: 'Summary', actions: [], confidence: 90, deliverable: { title: 'Deliverable', copyReadyText: 'Full usable output', sourceSummary: 'Supplied facts' } }, trace: { workflow: { status: 'ok', failedOperations: 0, fallbackOperations: 0, retriedOperations: 1, attempts: [{ node: 'router', operation: 'fetch_context', status: 'success', attempts: 2, retried: true, recovered: true, durationMs: 42 }] }, supervisorReview: { status: 'succeeded', path: 'review', severity: 'error', findingCount: 1 }, selectedShards: [{ title: 'Facts', source: 'Source', excerpt: 'Evidence', score: 99 }] } };
const run: AgentRun = { id: 'run-1', agentId: 'a', source: 'manual', submittedText: 'Exact', commandText: 'Immutable command', state: 'complete', startedAt: 1, progress: [], response };

describe('shared result parity', () => {
  afterEach(() => vi.unstubAllGlobals());
  it('exports the original rich trace and renders measured node timings', async () => {
    const writeText = vi.fn(async (_text: string) => {});
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
    render(<CommandSources commandResult={response} />);
    expect(screen.getByText('42ms')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Copy JSON' }));
    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    expect(JSON.parse(writeText.mock.calls[0][0])).toMatchObject({ commandId: 'command-1', commandText: 'Immutable command', workflow: response.trace?.workflow, supervisorReview: response.trace?.supervisorReview, selectedShards: [{ title: 'Facts', score: 99 }] });
  });
  it('preserves full diagnostics and labels error findings accurately', () => {
    render(<CommandDetails commandResult={response} />);
    expect(screen.getByTestId('dev-metric-supervisor')).toHaveTextContent('errors');
    expect(screen.getByTestId('dev-metric-sqlsync')).toBeInTheDocument();
    expect(screen.getByTestId('dev-metric-mutations')).toBeInTheDocument();
  });
  it('renders sparse output and copies actions without waiting for action memory', async () => {
    const writeText = vi.fn(async (_text: string) => {});
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})));
    render(<AgentResults run={{ ...run, response: { ...response, trace: undefined, result: { ...response.result, actionItems: [{ id: 'copy', kind: 'copy', label: 'Copy action', description: 'Ready text', copyText: 'Action text' }] } } }} />);
    expect(screen.getByText('Full usable output')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Copy action/ }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith('Action text'));
  });
});
