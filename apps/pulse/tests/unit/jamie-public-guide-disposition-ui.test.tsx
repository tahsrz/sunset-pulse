import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  fetch: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: mocks.refresh }) }));

import AgentLeadActions from '@/app/admin/agent-leads/AgentLeadActions';

describe('Jamie public guide disposition UI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('React', React);
    vi.stubGlobal('fetch', mocks.fetch);
    mocks.fetch.mockResolvedValue(new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }));
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('submits only a fixed selected lead outcome', async () => {
    render(
      <AgentLeadActions
        lead={{
          id: '11111111-1111-4111-8111-111111111111',
          agent_id: 'broker-one',
          site: 'broker-one',
          name: 'Jamie Lead',
          email: 'lead@example.test',
          phone: '',
          message: '',
          source: 'jamie_public_guide',
          status: 'new',
          internal_note: '',
          metadata: {},
          created_at: '2026-07-24T12:00:00.000Z',
        }}
        publicGuideDisposition="unassigned"
      />,
    );

    fireEvent.change(screen.getByLabelText('Jamie Lead Outcome'), { target: { value: 'qualified' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Outcome' }));

    await waitFor(() => expect(mocks.fetch).toHaveBeenCalledTimes(1));
    const [, options] = mocks.fetch.mock.calls[0];
    expect(JSON.parse(String(options?.body))).toEqual(expect.objectContaining({
      id: '11111111-1111-4111-8111-111111111111',
      expectedRevision: 1,
      requestKey: expect.any(String),
      action: 'disposition',
      disposition: 'qualified',
    }));
    expect(mocks.refresh).toHaveBeenCalled();
  });

  it('opens the native primary action and tracks it without contact details', async () => {
    render(
      <AgentLeadActions
        lead={{
          id: '11111111-1111-4111-8111-111111111111',
          agent_id: 'broker-one',
          site: 'broker-one',
          name: 'Jamie Lead',
          email: 'lead@example.test',
          phone: '(214) 555-1212',
          preferred_contact: 'phone',
          message: 'Please call me.',
          status: 'new',
          internal_note: '',
          metadata: {},
          created_at: '2026-07-24T12:00:00.000Z',
        }}
      />,
    );

    const action = screen.getByRole('link', { name: 'Call Lead (High Intent)' });
    expect(action).toHaveAttribute('href', 'tel:2145551212');
    fireEvent.click(action);

    await waitFor(() => expect(mocks.fetch).toHaveBeenCalledWith(
      '/api/admin/agent-leads/action-events',
      expect.objectContaining({ method: 'POST', keepalive: true }),
    ));
    const [, options] = mocks.fetch.mock.calls[0];
    expect(JSON.parse(String(options?.body))).toEqual({
      leadId: '11111111-1111-4111-8111-111111111111',
      actionType: 'call',
      agentId: 'broker-one',
      listingId: null,
    });
  });

  it('offers a reply-linked follow-up using the committed event id and lead revision', async () => {
    mocks.fetch
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true, result: {
        eventId: '22222222-2222-4222-8222-222222222222', leadRevision: 5,
      } }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
      .mockResolvedValueOnce(Response.json({ ok: true, result: null }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true, result: { itemId: 'planner-item' } }), {
        status: 200, headers: { 'Content-Type': 'application/json' },
      }));

    render(<AgentLeadActions lead={{
      id: '11111111-1111-4111-8111-111111111111',
      agent_id: 'broker-one', site: 'broker-one', name: 'Seller Lead',
      email: 'seller@example.test', phone: '', message: '', source: 'seller_plan', status: 'new',
      internal_note: '', metadata: { sellerPlan: { requestedContact: { granted: true } } },
      created_at: '2026-07-24T12:00:00.000Z',
    }} revision={4} canManageSellerLead personalTimeZone="America/Chicago" />);

    fireEvent.click(screen.getByRole('button', { name: 'Record reply' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Schedule reply follow-up' })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Schedule reply follow-up' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Schedule response' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'Schedule response' }));

    await waitFor(() => expect(mocks.fetch).toHaveBeenCalledTimes(3));
    const scheduleWrites = mocks.fetch.mock.calls.filter(([url, options]) => url === '/api/realtor/planner' && options?.method === 'POST');
    expect(scheduleWrites).toHaveLength(1);
    const scheduleBody = JSON.parse(String(scheduleWrites[0][1]?.body));
    expect(scheduleBody.item.sellerLead).toEqual({
      leadId: '11111111-1111-4111-8111-111111111111',
      actionKey: 'reply:22222222-2222-4222-8222-222222222222',
      expectedLeadRevision: 5,
    });
  });

  it('keeps the saved seller status when a pipeline update conflicts', async () => {
    mocks.fetch.mockResolvedValueOnce(new Response(JSON.stringify({
      ok: false, error: 'This record changed. Reload it before saving.',
    }), { status: 409, headers: { 'Content-Type': 'application/json' } }));
    render(<AgentLeadActions lead={sellerLead} revision={4} canManageSellerLead />);

    fireEvent.click(screen.getByRole('button', { name: 'Archived' }));

    await waitFor(() => expect(screen.getByText('This record changed. Reload it before saving.')).toBeInTheDocument());
    expect(screen.getByRole('link', { name: 'Draft seller response' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Schedule next action' })).toBeInTheDocument();
    expect(mocks.refresh).not.toHaveBeenCalled();
    expect(JSON.parse(String(mocks.fetch.mock.calls[0][1]?.body))).toMatchObject({
      id: sellerLead.id, action: 'set_status', status: 'archived', expectedRevision: 4,
    });
  });

  it('follows refreshed seller status when another session archives the request', () => {
    const { rerender } = render(<AgentLeadActions lead={sellerLead} revision={4} canManageSellerLead />);
    expect(screen.getByRole('link', { name: 'Draft seller response' })).toBeInTheDocument();

    rerender(<AgentLeadActions lead={{ ...sellerLead, status: 'archived' }} revision={5} canManageSellerLead />);

    expect(screen.queryByRole('link', { name: 'Draft seller response' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Schedule next action' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Copy Email Draft' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Record attempt' })).toBeDisabled();
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
});

const sellerLead = {
  id: '11111111-1111-4111-8111-111111111111',
  agent_id: 'broker-one', site: 'broker-one', name: 'Seller Lead',
  email: 'seller@example.test', phone: '', message: '', source: 'seller_plan', status: 'new' as const,
  created_at: '2026-10-06T12:00:00.000Z',
  metadata: { sellerPlan: {
    requestKind: 'seller_plan', timing: 'exploring',
    requestedContact: { granted: true, capturedAt: '2026-10-06T12:00:00.000Z' },
  } },
};
