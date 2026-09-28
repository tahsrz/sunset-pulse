import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import manifest from '@/lib/platform/apps/manifests/real-estate-readiness.v1.json';
import { CommandPalette } from '@/components/platform/CommandPalette';
import type { CanvasLayout } from '@/lib/platform/contracts/canvasLayout';

const workspaceId = '11111111-1111-4111-8111-111111111111';
const runId = '22222222-2222-4222-8222-222222222222';
const run = { id: runId, status: 'waiting', revision: 7, definition: { key: 'readiness-intake', version: 1 } };
const install = { id: '33333333-3333-4333-8333-333333333333', appKey: manifest.key, revision: 4, status: 'installed', manifest };
const inboxWindow: CanvasLayout['windows'][number] = {
  window: { id: '44444444-4444-4444-8444-444444444444', kind: 'checkpoint_inbox', target: { workspaceId } },
  x: 0, y: 0, width: 640, height: 480, zIndex: 1,
};
const runWindow: CanvasLayout['windows'][number] = {
  window: { id: '55555555-5555-4555-8555-555555555555', kind: 'run_graph', target: { workspaceId, runId } },
  x: 0, y: 0, width: 640, height: 480, zIndex: 1,
};
const renderPalette = (overrides: Partial<React.ComponentProps<typeof CommandPalette>> = {}) => render(
  <CommandPalette workspaceId={workspaceId} windows={[]} onFocusInbox={vi.fn()} onFocusRun={vi.fn()}
    onCloseWindow={vi.fn(async () => true)} onResetLayout={vi.fn(async () => true)} {...overrides} />,
);

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe('workspace command palette', () => {
  it('lists only the bounded runs page and performs no mutation for /ps', async () => {
    const fetchMock = vi.fn(async () => Response.json({ ok: true, result: { items: [run], nextCursor: null } }));
    vi.stubGlobal('fetch', fetchMock);
    renderPalette();
    fireEvent.change(screen.getByLabelText('Workspace command'), { target: { value: '/ps' } });
    fireEvent.click(screen.getByRole('button', { name: 'Preview' }));
    expect(await screen.findByText(/readiness-intake · waiting/)).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledWith(`/api/workspaces/${workspaceId}/runs?limit=25`, { cache: 'no-store' });
    expect(fetchMock.mock.calls.some(([, init]) => ['POST', 'PATCH'].includes(init?.method || ''))).toBe(false);
  });

  it('previews a workspace run and cancels only after explicit confirmation with its listed revision', async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === 'PATCH') return Response.json({ ok: true, result: run });
      return Response.json({ ok: true, result: { items: [run], nextCursor: null } });
    });
    vi.stubGlobal('fetch', fetchMock);
    renderPalette();
    fireEvent.change(screen.getByLabelText('Workspace command'), { target: { value: `/cancel ${runId}` } });
    fireEvent.click(screen.getByRole('button', { name: 'Preview' }));
    expect(await screen.findByText(/Confirm cancellation.*revision 7/)).toBeTruthy();
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'PATCH')).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: 'Confirm cancel' }));
    await waitFor(() => expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'PATCH')).toBe(true));
    const patchCall = fetchMock.mock.calls.find(([, init]) => init?.method === 'PATCH');
    expect(JSON.parse(String(patchCall?.[1]?.body))).toEqual({ runId, expectedRevision: 7 });
  });

  it('previews the exact installed manifest, collects its schema inputs, and launches on confirmation', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      if (String(input).endsWith('/apps')) return Response.json({ ok: true, result: [install] });
      return Response.json({ ok: true, result: { id: runId } });
    });
    const onRunStarted = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    renderPalette({ onRunStarted });
    fireEvent.change(screen.getByLabelText('Workspace command'), { target: { value: `/start ${manifest.key}@${manifest.version}` } });
    fireEvent.click(screen.getByRole('button', { name: 'Preview' }));
    expect(await screen.findByText(/Keller \/ Westlake readiness intake/)).toBeTruthy();
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'POST')).toBe(false);
    fireEvent.change(await screen.findByLabelText(/Shortlist property ID/), { target: { value: 'property-123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirm and launch' }));
    await waitFor(() => expect(onRunStarted).toHaveBeenCalledWith(runId));
    const launchCall = fetchMock.mock.calls.find(([url]) => String(url).endsWith('/apps/launch'));
    expect(JSON.parse(String(launchCall?.[1]?.body))).toMatchObject({
      installId: install.id, expectedInstallRevision: install.revision, workflowKey: 'readiness-intake',
      inputs: { property_id: 'property-123' }, resourceRefs: [],
    });
  });

  it('focuses only a visible inbox or a run in the bounded workspace run list', async () => {
    const fetchMock = vi.fn(async () => Response.json({ ok: true, result: { items: [run], nextCursor: null } }));
    const onFocusInbox = vi.fn();
    const onFocusRun = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    renderPalette({ windows: [inboxWindow], onFocusInbox, onFocusRun });

    fireEvent.change(screen.getByLabelText('Workspace command'), { target: { value: ':focus inbox' } });
    fireEvent.click(screen.getByRole('button', { name: 'Preview' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Confirm focus' }));
    expect(onFocusInbox).toHaveBeenCalledOnce();

    fireEvent.change(screen.getByLabelText('Workspace command'), { target: { value: `:focus run ${runId}` } });
    fireEvent.click(screen.getByRole('button', { name: 'Preview' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Confirm focus' }));
    await waitFor(() => expect(onFocusRun).toHaveBeenCalledWith(runId));
  });

  it('confirms close only for a canvas window and confirms reset before invoking layout persistence', async () => {
    const onCloseWindow = vi.fn(async () => true);
    const onResetLayout = vi.fn(async () => true);
    renderPalette({ windows: [runWindow], onCloseWindow, onResetLayout });

    fireEvent.change(screen.getByLabelText('Workspace command'), { target: { value: `:close ${runWindow.window.id}` } });
    fireEvent.click(screen.getByRole('button', { name: 'Preview' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Confirm close window' }));
    await waitFor(() => expect(onCloseWindow).toHaveBeenCalledWith(runWindow.window.id));

    fireEvent.change(screen.getByLabelText('Workspace command'), { target: { value: ':reset-layout' } });
    fireEvent.click(screen.getByRole('button', { name: 'Preview' }));
    expect(onResetLayout).not.toHaveBeenCalled();
    fireEvent.click(await screen.findByRole('button', { name: 'Confirm reset layout' }));
    await waitFor(() => expect(onResetLayout).toHaveBeenCalledOnce());
  });

  it('does not accept closing a window that is not in the private canvas layout', async () => {
    renderPalette();
    fireEvent.change(screen.getByLabelText('Workspace command'), { target: { value: ':close 55555555-5555-4555-8555-555555555555' } });
    fireEvent.click(screen.getByRole('button', { name: 'Preview' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('not present on your canvas');
  });
});
