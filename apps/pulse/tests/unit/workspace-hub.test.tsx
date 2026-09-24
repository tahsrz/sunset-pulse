import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { WorkspaceHub } from '@/components/platform/WorkspaceHub';

const mocks = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mocks.push }) }));

afterEach(() => { cleanup(); vi.unstubAllGlobals(); mocks.push.mockReset(); });

describe('workspace hub', () => {
  it('lists only API-returned workspaces with inbox and canvas entry points', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({ ok: true, workspaces: [{
      workspace: { id: '11111111-1111-4111-8111-111111111111', kind: 'team', name: 'Keller Westlake', revision: 2 },
      membership: { role: 'owner' },
    }] })));
    render(<WorkspaceHub />);
    expect(await screen.findByRole('heading', { name: 'Keller Westlake' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Open inbox' }).getAttribute('href')).toBe('/workspaces/11111111-1111-4111-8111-111111111111/inbox');
    expect(screen.getByRole('link', { name: 'Open canvas' }).getAttribute('href')).toBe('/workspaces/11111111-1111-4111-8111-111111111111/canvas');
  });

  it('creates a team workspace through the authenticated API and navigates to its inbox', async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => init?.method === 'POST'
      ? Response.json({ ok: true, workspaceId: '22222222-2222-4222-8222-222222222222' }, { status: 201 })
      : Response.json({ ok: true, workspaces: [] }));
    vi.stubGlobal('fetch', fetchMock);
    render(<WorkspaceHub />);
    fireEvent.change(await screen.findByLabelText('Workspace name'), { target: { value: 'Keller–Westlake Team' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create team workspace' }));
    await waitFor(() => expect(mocks.push).toHaveBeenCalledWith('/workspaces/22222222-2222-4222-8222-222222222222/inbox'));
    const creation = fetchMock.mock.calls.find(([, init]) => init?.method === 'POST');
    expect(JSON.parse(String(creation?.[1]?.body))).toEqual({ kind: 'team', name: 'Keller–Westlake Team' });
  });

  it('shows safe errors instead of pretending a failed workspace create succeeded', async () => {
    vi.stubGlobal('fetch', vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => init?.method === 'POST'
      ? Response.json({ ok: false, error: 'Workspace creation is currently unavailable.' }, { status: 503 })
      : Response.json({ ok: true, workspaces: [] })));
    render(<WorkspaceHub />);
    fireEvent.change(await screen.findByLabelText('Workspace name'), { target: { value: 'Pilot' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create team workspace' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Workspace creation is currently unavailable.');
    expect(mocks.push).not.toHaveBeenCalled();
  });
});
