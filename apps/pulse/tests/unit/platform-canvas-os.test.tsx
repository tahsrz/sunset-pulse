import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';

vi.mock('@/components/platform/PlatformInbox', () => ({
  PlatformInbox: () => <div>Existing checkpoint inbox read surface</div>,
}));
vi.mock('@/components/platform/RunDetail', () => ({
  RunDetail: ({ runId }: { runId: string }) => <div>Existing run read surface: {runId}</div>,
}));

import { CanvasOS } from '@/components/platform/CanvasOS';

const workspaceId = '11111111-1111-4111-8111-111111111111';
const runId = '22222222-2222-4222-8222-222222222222';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('workspace spatial canvas', () => {
  it('composes existing read views and persists only a user layout on explicit save', async () => {
    const requests: Array<{ url: string; init?: RequestInit }> = [];
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      requests.push({ url, init });
      if (url.endsWith('/layout') && init?.method === 'PUT') {
        const body = JSON.parse(String(init.body));
        return Response.json({ ok: true, result: { layout: body.layout, revision: 1 } });
      }
      if (url.endsWith('/layout')) return Response.json({ ok: true, result: null });
      if (url.endsWith('/runs?limit=25')) return Response.json({ ok: true, result: { items: [
        { id: runId, status: 'waiting', definition: { key: 'readiness', version: 1 } },
      ] } });
      return Response.json({ ok: true, result: {} });
    }));

    render(<CanvasOS workspaceId={workspaceId} />);
    expect(await screen.findByText('Existing checkpoint inbox read surface')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Open the standard inbox view' })).toBeTruthy();

    fireEvent.change(screen.getByLabelText('Choose a workspace run'), { target: { value: runId } });
    fireEvent.click(screen.getByRole('button', { name: 'Add run' }));
    expect(await screen.findByText(`Existing run read surface: ${runId}`)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Save layout' }));

    await waitFor(() => expect(requests.some(({ url, init }) => url.endsWith('/layout') && init?.method === 'PUT')).toBe(true));
    const saveRequest = requests.find(({ url, init }) => url.endsWith('/layout') && init?.method === 'PUT');
    const saved = JSON.parse(String(saveRequest?.init?.body));
    expect(saved.expectedRevision).toBeNull();
    expect(saved.layout.workspaceId).toBe(workspaceId);
    expect(saved.layout.windows.some((window: { window: { kind: string; target: { workspaceId: string; runId?: string } } }) =>
      window.window.kind === 'run_graph' && window.window.target.workspaceId === workspaceId && window.window.target.runId === runId,
    )).toBe(true);
    expect(requests.some(({ url }) => /\/checkpoints|\/runs\/[^?]+$/.test(url))).toBe(false);
  });
});
