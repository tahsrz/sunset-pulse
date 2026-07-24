import { beforeEach, describe, expect, it, vi } from 'vitest';

const actionRouteMocks = vi.hoisted(() => ({
  saveCommandActionMemory: vi.fn(),
  recordTensorZeroFeedback: vi.fn(),
}));

vi.mock('@/lib/command-center/queryMemory', () => ({
  saveCommandActionMemory: actionRouteMocks.saveCommandActionMemory,
}));

vi.mock('@/lib/tensorzero/feedback', () => ({
  recordTensorZeroFeedback: actionRouteMocks.recordTensorZeroFeedback,
}));

import { POST } from '@/app/api/commands/actions/route';

describe('command action memory route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    actionRouteMocks.saveCommandActionMemory.mockReturnValue({ saved: true, attempts: [] });
    actionRouteMocks.recordTensorZeroFeedback.mockReturnValue({ recorded: true });
  });

  it('rejects unsafe external-link actions before saving memory', async () => {
    const response = await POST(jsonRequest({
      commandId: 'cmd_123',
      command: 'open the listing',
      action: {
        id: 'bad-link',
        label: 'Open',
        kind: 'external-link',
        href: 'javascript:alert(1)',
      },
    }));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe('External link actions require a safe http(s) href.');
    expect(actionRouteMocks.saveCommandActionMemory).not.toHaveBeenCalled();
  });

  it('requires kind-specific payload fields', async () => {
    const response = await POST(jsonRequest({
      commandId: 'cmd_123',
      command: 'copy the service request',
      action: {
        id: 'copy-service-request',
        label: 'Copy',
        kind: 'copy',
      },
    }));

    expect(response.status).toBe(400);
    expect(actionRouteMocks.saveCommandActionMemory).not.toHaveBeenCalled();
  });

  it('saves valid action memories and feedback', async () => {
    const response = await POST(jsonRequest({
      commandId: ' cmd_123 ',
      command: ' copy this ',
      workerId: 'service',
      action: {
        id: 'copy-service-request',
        label: 'Copy',
        kind: 'copy',
        copyText: '26-00243099',
      },
    }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(actionRouteMocks.saveCommandActionMemory).toHaveBeenCalledWith(expect.objectContaining({
      commandId: 'cmd_123',
      command: 'copy this',
      action: expect.objectContaining({
        kind: 'copy',
        copyText: '26-00243099',
      }),
    }));
    expect(actionRouteMocks.recordTensorZeroFeedback).toHaveBeenCalledWith(expect.objectContaining({
      metricName: 'command_center_actionability',
      value: 1,
    }));
  });
});

function jsonRequest(body: unknown) {
  return new Request('http://localhost/api/commands/actions', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  });
}
