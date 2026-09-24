import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

const mocks = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mocks.push }) }));

import { WorkspaceAccessManager } from '@/components/platform/WorkspaceAccessManager';
import { AcceptWorkspaceInvitation } from '@/components/platform/AcceptWorkspaceInvitation';

const workspaceId = '22222222-2222-4222-8222-222222222222';
const pending = { id: '33333333-3333-4333-8333-333333333333', email: 'reviewer@example.com', role: 'reviewer', status: 'pending', expires_at: '2026-10-01T00:00:00Z' };

afterEach(() => { cleanup(); window.sessionStorage.clear(); vi.unstubAllGlobals(); mocks.push.mockReset(); });

describe('workspace invitation UI', () => {
  it('creates a role-scoped link without sending email and supports explicit copy', async () => {
    const token = 'A'.repeat(43);
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === 'POST') return Response.json({ ok: true, result: { token, delivery: 'not_sent' } }, { status: 201 });
      return Response.json({ ok: true, result: [] });
    });
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('fetch', fetchMock);
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
    render(<WorkspaceAccessManager workspaceId={workspaceId} actorId="11111111-1111-4111-8111-111111111111" />);
    fireEvent.change(await screen.findByLabelText('Their account email'), { target: { value: 'reviewer@example.com' } });
    fireEvent.change(screen.getByLabelText('Workspace role'), { target: { value: 'reviewer' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create invite link' }));
    const link = await screen.findByLabelText('One-time invitation link') as HTMLInputElement;
    expect(new URLSearchParams(new URL(link.value).hash.slice(1)).get('token')).toBe(token);
    expect(await screen.findByRole('status')).toHaveTextContent('Delivery was not sent');
    expect(fetchMock.mock.calls.filter(([, init]) => init?.method === 'POST')).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: 'Copy link' }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(link.value));
  });

  it('requires confirmation before revoking a pending invitation', async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === 'DELETE') return Response.json({ ok: true, result: { revoked: true } });
      if (String(_input).endsWith('/invitations')) return Response.json({ ok: true, result: [pending] });
      return Response.json({ ok: true, result: [] });
    });
    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal('confirm', vi.fn(() => false));
    render(<WorkspaceAccessManager workspaceId={workspaceId} actorId="11111111-1111-4111-8111-111111111111" />);
    fireEvent.click(await screen.findByRole('button', { name: 'Revoke invite' }));
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'DELETE')).toBe(false);
    vi.stubGlobal('confirm', vi.fn(() => true));
    fireEvent.click(screen.getByRole('button', { name: 'Revoke invite' }));
    await waitFor(() => expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'DELETE')).toBe(true));
  });

  it('lets an owner revoke active member access only after confirmation', async () => {
    let revoked = false;
    const owner = { membership_id: 'owner-membership', user_id: 'owner-user', email: 'owner@example.com', role: 'owner', status: 'active', revision: 1 };
    const member = { membership_id: 'member-membership', user_id: 'member-user', email: 'member@example.com', role: 'member', status: 'active', revision: 1 };
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      if (String(_input).endsWith('/members') && init?.method === 'DELETE') { revoked = true; return Response.json({ ok: true, result: { status: 'revoked' } }); }
      if (String(_input).endsWith('/members')) return Response.json({ ok: true, result: [owner, { ...member, status: revoked ? 'revoked' : 'active' }] });
      return Response.json({ ok: true, result: [] });
    });
    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal('confirm', vi.fn(() => false));
    render(<WorkspaceAccessManager workspaceId={workspaceId} actorId="owner-user" />);
    const revoke = await screen.findByRole('button', { name: 'Revoke access' });
    fireEvent.click(revoke);
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'DELETE')).toBe(false);
    vi.stubGlobal('confirm', vi.fn(() => true));
    fireEvent.click(revoke);
    await waitFor(() => expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'DELETE')).toBe(true));
    expect(JSON.parse(String(fetchMock.mock.calls.find(([, init]) => init?.method === 'DELETE')?.[1]?.body))).toEqual({ membershipId: 'member-membership' });
    expect(await screen.findByText('member · revoked')).toBeTruthy();
  });

  it('does not offer admins a control to revoke another admin', async () => {
    const admin = { membership_id: 'admin-membership', user_id: 'admin-user', email: 'admin@example.com', role: 'admin', status: 'active', revision: 1 };
    const otherAdmin = { ...admin, membership_id: 'other-admin-membership', user_id: 'other-admin-user', email: 'other-admin@example.com' };
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => String(input).endsWith('/members')
      ? Response.json({ ok: true, result: [admin, otherAdmin] })
      : Response.json({ ok: true, result: [] })));
    render(<WorkspaceAccessManager workspaceId={workspaceId} actorId="admin-user" />);
    await waitFor(() => expect(screen.getAllByText('admin · active')).toHaveLength(2));
    expect(screen.queryByRole('button', { name: 'Revoke access' })).toBeNull();
  });

  it('rejects a malformed token without making a request', () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    render(<AcceptWorkspaceInvitation token="bad-token" />);
    expect(screen.getByRole('alert')).toHaveTextContent('missing or malformed');
    expect(screen.getByRole('button', { name: 'Confirm and join workspace' })).toBeDisabled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('does not fall back to a stale session token when an explicit fragment is empty', async () => {
    window.history.replaceState({}, '', '/workspace-invitations/accept#token=');
    window.sessionStorage.setItem('sunset-pulse.workspace-invitation-token', 'D'.repeat(43));
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    render(<AcceptWorkspaceInvitation token="" />);
    expect(await screen.findByText('This invitation link is missing or malformed. Ask the workspace owner for a new link.')).toBeTruthy();
    expect(window.sessionStorage.getItem('sunset-pulse.workspace-invitation-token')).toBeNull();
    expect(window.location.hash).toBe('');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('routes unauthenticated invitees to sign-in while preserving the invitation URL', async () => {
    window.history.replaceState({}, '', '/workspace-invitations/accept');
    window.sessionStorage.setItem('sunset-pulse.workspace-invitation-token', 'B'.repeat(43));
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({ ok: false }, { status: 401 })));
    render(<AcceptWorkspaceInvitation token="" />);
    fireEvent.click(screen.getByRole('button', { name: 'Confirm and join workspace' }));
    await waitFor(() => expect(mocks.push).toHaveBeenCalledWith('/login?redirect=%2Fworkspace-invitations%2Faccept'));
  });

  it('joins only after an explicit successful server acceptance', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({ ok: true, workspace_id: workspaceId })));
    render(<AcceptWorkspaceInvitation token={'C'.repeat(43)} />);
    fireEvent.click(screen.getByRole('button', { name: 'Confirm and join workspace' }));
    await waitFor(() => expect(mocks.push).toHaveBeenCalledWith(`/workspaces/${workspaceId}/inbox`));
  });
});
