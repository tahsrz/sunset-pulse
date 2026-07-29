import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  defaultPreferences,
  starterJobs,
  type CommandResponse,
} from '../../components/agent-console/agentConsoleConfig';
import { trackAgentConsoleEvent } from '../../components/agent-console/agentConsoleEvents';
import { useAgentConsoleRun } from '../../components/agent-console/useAgentConsoleRun';

vi.mock('../../components/agent-console/agentConsoleEvents', () => ({
  trackAgentConsoleEvent: vi.fn(),
}));

const commandResponse: CommandResponse = {
  commandId: 'cmd_456',
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
  trace: {
    progress: [
      { id: 'complete', label: 'Complete', status: 'complete', detail: 'Ready to send.' },
    ],
  },
};

function streamResponse(parts: string[]) {
  const encoder = new TextEncoder();
  return new Response(new ReadableStream({
    start(controller) {
      for (const part of parts) {
        controller.enqueue(encoder.encode(part));
      }
      controller.close();
    },
  }));
}

describe('useAgentConsoleRun', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('submits a voiced command and stores the streamed result', async () => {
    const fetchMock = vi.fn().mockResolvedValue(streamResponse([
      'event: progress\ndata: {"id":"route","label":"Advisor route","status":"complete"}\n\n',
      `event: result\ndata: ${JSON.stringify(commandResponse)}\n\n`,
    ]));
    vi.stubGlobal('fetch', fetchMock);

    const selectedJob = starterJobs[0];
    const { result } = renderHook(() => useAgentConsoleRun({
      preferences: { ...defaultPreferences, agentName: 'Taz' },
      selectedExamplesCount: 2,
      selectedJob,
    }));

    await act(async () => {
      await result.current.runAgentJob(' Buyer toured Oak Cliff and wants commute options. ');
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, request] = fetchMock.mock.calls[0];
    const body = JSON.parse(request.body);
    expect(request.method).toBe('POST');
    expect(request.headers.Accept).toBe('text/event-stream');
    expect(body.selectedWorkerId).toBe(selectedJob.workerId);
    expect(body.relayMode).toBe(selectedJob.relayMode);
    expect(body.supervisor).toBe(true);
    expect(body.command).toContain(selectedJob.prompt);
    expect(body.command).toContain('Agent name: Taz');
    expect(body.command).toContain('Input:\nBuyer toured Oak Cliff and wants commute options.');
    expect(result.current.running).toBe(false);
    expect(result.current.currentInput).toBe('Buyer toured Oak Cliff and wants commute options.');
    expect(result.current.result).toEqual(commandResponse);
    expect(result.current.progress).toEqual(commandResponse.trace?.progress);
    expect(trackAgentConsoleEvent).toHaveBeenCalledWith(expect.objectContaining({
      event: 'run_submitted',
      jobId: selectedJob.id,
      savedExampleCount: 2,
    }));
    expect(trackAgentConsoleEvent).toHaveBeenCalledWith(expect.objectContaining({
      commandId: commandResponse.commandId,
      event: 'run_completed',
      resultLength: commandResponse.result.deliverable.copyReadyText.length,
    }));
  });

  it('stores request errors and tracks failed runs', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(
      JSON.stringify({ error: 'Route unavailable' }),
      { status: 500 },
    )));

    const selectedJob = starterJobs[0];
    const { result } = renderHook(() => useAgentConsoleRun({
      preferences: defaultPreferences,
      selectedExamplesCount: 0,
      selectedJob,
    }));

    await act(async () => {
      await result.current.runAgentJob('Need help with this lead.');
    });

    expect(result.current.running).toBe(false);
    expect(result.current.result).toBeNull();
    expect(result.current.error).toBe('Route unavailable');
    expect(trackAgentConsoleEvent).toHaveBeenCalledWith(expect.objectContaining({
      event: 'run_failed',
      jobId: selectedJob.id,
    }));
  });

  it('clears output state for job changes', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(streamResponse([
      `event: result\ndata: ${JSON.stringify(commandResponse)}\n\n`,
    ])));

    const { result } = renderHook(() => useAgentConsoleRun({
      preferences: defaultPreferences,
      selectedExamplesCount: 0,
      selectedJob: starterJobs[0],
    }));

    await act(async () => {
      await result.current.runAgentJob('Need a follow up.');
    });
    act(() => result.current.markResultSaved());
    expect(result.current.result).toEqual(commandResponse);
    expect(result.current.savedResult).toBe(true);

    act(() => result.current.resetRunOutput());

    expect(result.current.error).toBeNull();
    expect(result.current.result).toBeNull();
    expect(result.current.savedResult).toBe(false);
  });
});
