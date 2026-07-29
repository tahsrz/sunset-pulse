import { describe, expect, it, vi } from 'vitest';
import {
  parseServerSentEvent,
  readCommandStream,
} from '../../components/agent-console/agentConsoleCommandStream';
import {
  formatProgressDetail,
  formatProgressLabel,
  progressDotClass,
  upsertProgressEvent,
} from '../../components/agent-console/agentConsoleProgress';
import { type CommandResponse } from '../../components/agent-console/agentConsoleConfig';

const commandResponse: CommandResponse = {
  commandId: 'cmd_123',
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

describe('agent console command stream', () => {
  it('parses server-sent events', () => {
    expect(parseServerSentEvent('event: progress\ndata: {"id":"route"}')).toEqual({
      event: 'progress',
      data: { id: 'route' },
    });
    expect(parseServerSentEvent('event: progress\ndata: nope')).toBeNull();
  });

  it('streams progress events and returns the command result', async () => {
    const onProgress = vi.fn();
    const response = streamResponse([
      'event: progress\ndata: {"id":"route","label":"Advisor route","status":"complete"}\n\n',
      `event: result\ndata: ${JSON.stringify(commandResponse)}\n\n`,
    ]);

    await expect(readCommandStream(response, onProgress)).resolves.toEqual(commandResponse);
    expect(onProgress).toHaveBeenCalledWith({
      id: 'route',
      label: 'Advisor route',
      status: 'complete',
    });
  });

  it('throws streamed errors', async () => {
    const response = streamResponse([
      'event: error\ndata: {"error":"No worker available"}\n\n',
    ]);

    await expect(readCommandStream(response, vi.fn())).rejects.toThrow('No worker available');
  });
});

describe('agent console progress helpers', () => {
  it('upserts progress events by id', () => {
    expect(upsertProgressEvent(
      [{ id: 'route', label: 'Route', status: 'running' }],
      { id: 'route', label: 'Route', status: 'complete' },
    )).toEqual([{ id: 'route', label: 'Route', status: 'complete' }]);
  });

  it('formats progress labels and details', () => {
    expect(formatProgressLabel({ id: 'route', label: 'Advisor route', status: 'complete' })).toBe('Choosing the right worker');
    expect(formatProgressLabel({ id: 'supervisor', label: 'Supervisor review', status: 'running' })).toBe('Checking the answer');
    expect(formatProgressDetail('x'.repeat(100))).toHaveLength(90);
  });

  it('maps progress statuses to UI classes', () => {
    expect(progressDotClass('complete')).toBe('bg-[#517268]');
    expect(progressDotClass('error')).toBe('bg-[#b94f35]');
    expect(progressDotClass('running')).toBe('bg-[#d8a647]');
    expect(progressDotClass('pending')).toBe('bg-[#c9d3ca]');
  });
});
