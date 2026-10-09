import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SellerInbox } from '@/components/realtor/SellerInbox';
import { SellerInboxLead } from '@/components/realtor/SellerInboxLead';
import type { OwnedSellerLead } from '@/lib/realtor-workspace/leadContracts';

vi.mock('@/components/realtor/SellerLeadScheduleDialog', () => ({
  SellerLeadScheduleDialog: ({ leadRevision, actionKey, consultationStartsAt }: { leadRevision: number; actionKey: string; consultationStartsAt?: string }) =>
    <div role="dialog" aria-label="Seller schedule">{leadRevision} · {actionKey} · {consultationStartsAt}</div>,
}));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });
const id = '11111111-1111-4111-8111-111111111111';
const eventId = '22222222-2222-4222-8222-222222222222';
const lead: OwnedSellerLead = {
  id, revision: 3, source: 'seller_plan', created_at: '2026-10-06T12:00:00Z',
  agent_id: 'seller-site', site: 'seller-site', name: 'Taylor Seller', email: 'taylor@example.test',
  message: 'Please prepare a seller plan.', status: 'new', contact_attempted_at: null, responded_at: null,
  metadata: { sellerPlan: { requestKind: 'seller_plan', timing: 'exploring',
    requestedContact: { granted: true, capturedAt: '2026-10-06T12:00:00Z' } } }, sellerOutcomeEvents: [],
};
const page = (leads: OwnedSellerLead[], nextCursor: string | null = null) => Response.json({ ok: true, result: { leads, nextCursor } });

describe('personal seller inbox', () => {
  it('pauses an open outcome dialog after a saved outcome cannot be reread and resumes without losing its next draft', async () => {
    let reads = 0;
    const fetchMock = vi.fn<typeof fetch>(async (url, options) => {
      if (options?.method === 'POST') return Response.json({ ok: true, result: { eventId, leadRevision: 4 } });
      if (String(url).startsWith('/api/realtor/leads/outcomes?')) return Response.json({ ok: true, result: { events: [], nextCursor: null } });
      reads += 1;
      return reads === 1 ? Response.json({ ok: false }, { status: 503 }) : page([{ ...lead, revision: 4 }]);
    });
    vi.stubGlobal('fetch', fetchMock);
    render(<SellerInboxLead lead={lead} timeZone="America/Chicago" />);
    fireEvent.click(screen.getByRole('button', { name: 'Record seller outcomes' }));
    const dialog = within(screen.getByRole('dialog', { name: 'Record seller outcomes' }));
    fireEvent.change(dialog.getByLabelText('Stable transaction reference'), { target: { value: 'file-one' } });
    fireEvent.click(dialog.getByRole('button', { name: 'Record closing' }));
    await dialog.findByText('Outcome actions are paused until the seller request is available and current.');
    fireEvent.change(dialog.getByLabelText('Stable transaction reference'), { target: { value: 'file-two' } });
    expect(dialog.getByRole('button', { name: 'Record closing' })).toBeDisabled();
    fireEvent.submit(dialog.getByRole('button', { name: 'Record closing' }).closest('form')!);
    expect(fetchMock.mock.calls.filter(([, options]) => options?.method === 'POST')).toHaveLength(1);
    fireEvent.click(dialog.getByRole('button', { name: 'Reload seller request' }));
    await waitFor(() => expect(dialog.getByRole('button', { name: 'Record closing' })).toBeEnabled());
    expect(dialog.getByLabelText('Stable transaction reference')).toHaveValue('file-two');
  });

  it('sends the actual local contact time and preserves retries while changed times get a new identity', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-10-09T00:00:00Z'));
    const fetchMock = vi.fn<typeof fetch>().mockRejectedValueOnce(new Error('Uncertain contact'))
      .mockRejectedValueOnce(new Error('Uncertain contact'))
      .mockResolvedValueOnce(Response.json({ ok: true, result: { eventId, leadRevision: 4 } }))
      .mockResolvedValueOnce(page([{ ...lead, revision: 4, contact_attempted_at: '2026-10-07T15:30:00Z' }]));
    vi.stubGlobal('fetch', fetchMock);
    render(<SellerInboxLead lead={lead} timeZone="America/Chicago" />);
    fireEvent.click(screen.getByText('Record an earlier contact or reply'));
    const time = screen.getByLabelText('Contact or reply time (America/Chicago)');
    fireEvent.change(time, { target: { value: '2026-10-07T09:30' } });
    fireEvent.click(screen.getByRole('button', { name: 'Record email contact' }));
    await screen.findByText('Uncertain contact');
    fireEvent.click(screen.getByRole('button', { name: 'Record email contact' }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Record email contact' })).toBeEnabled());
    fireEvent.change(time, { target: { value: '2026-10-07T10:30' } });
    fireEvent.click(screen.getByRole('button', { name: 'Record email contact' }));
    await screen.findByText('Email contact attempt recorded.');
    expect(fetchMock.mock.calls[0][1]?.body).toBe(fetchMock.mock.calls[1][1]?.body);
    const first = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
    const changed = JSON.parse(String(fetchMock.mock.calls[2][1]?.body));
    expect(first.occurredAt).toBe('2026-10-07T14:30:00.000Z');
    expect(changed.occurredAt).toBe('2026-10-07T15:30:00.000Z');
    expect(changed.requestKey).not.toBe(first.requestKey);
    expect(time).toHaveValue('');
  });

  it('returns one page at a time after an older-page read fails, then resets navigation at the newest page', async () => {
    const fetchMock = vi.fn<typeof fetch>(async (url) => {
      const cursor = new URL(String(url), 'https://example.test').searchParams.get('cursor');
      if (cursor === 'third') return Response.json({ ok: false }, { status: 503 });
      return cursor === 'second' ? page([{ ...lead, id: eventId, name: 'Second page seller' }], 'third') : page([lead], 'second');
    });
    vi.stubGlobal('fetch', fetchMock);
    render(<SellerInbox timeZone="America/Chicago" />);
    await screen.findByRole('heading', { name: 'Taylor Seller' });
    fireEvent.click(screen.getByRole('button', { name: 'Load older seller requests' }));
    await screen.findByRole('heading', { name: 'Second page seller' });
    fireEvent.click(screen.getByRole('button', { name: 'Load older seller requests' }));
    await screen.findByRole('alert');
    fireEvent.click(screen.getByRole('button', { name: 'Previous seller requests page' }));
    await screen.findByRole('heading', { name: 'Second page seller' });
    fireEvent.click(screen.getByRole('button', { name: 'Previous seller requests page' }));
    await screen.findByRole('heading', { name: 'Taylor Seller' });
    expect(screen.queryByRole('button', { name: 'Previous seller requests page' })).not.toBeInTheDocument();
    expect(fetchMock.mock.calls.map(([url]) => new URL(String(url), 'https://example.test').searchParams.get('cursor'))).toEqual([null, 'second', 'third', 'second', null]);
    expect(fetchMock.mock.calls.every(([, options]) => !options?.method)).toBe(true);
  });

  it('requires confirmation for contact revocation and refreshes permission after an uncertain retry', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockRejectedValueOnce(new Error('Connection interrupted'))
      .mockResolvedValueOnce(Response.json({ ok: true, result: { eventId, leadRevision: 4 } }))
      .mockResolvedValueOnce(page([{ ...lead, revision: 4, metadata: { sellerPlan: { requestedContact: {
        granted: true, capturedAt: '2026-10-06T12:00:00Z', revokedAt: '2026-10-07T12:00:00Z',
      } } } }]));
    vi.stubGlobal('fetch', fetchMock);
    render(<SellerInboxLead lead={lead} timeZone="America/Chicago" />);
    fireEvent.click(screen.getByRole('button', { name: 'Revoke requested contact' }));
    expect(fetchMock).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Keep requested contact' }));
    expect(fetchMock).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Revoke requested contact' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm contact revocation' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Confirm contact revocation' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'Confirm contact revocation' }));
    await screen.findByText('Requested-contact permission: not active.');
    const first = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
    expect(first).toEqual({ leadId: id, expectedRevision: 3, action: 'revoke_requested_contact', requestKey: expect.any(String) });
    expect(fetchMock.mock.calls[1][1]?.body).toBe(fetchMock.mock.calls[0][1]?.body);
    expect(screen.getByRole('button', { name: 'Schedule response' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Revoke requested contact' })).not.toBeInTheDocument();
  });

  it('disables the initial response schedule after contact while preserving eligible reply follow-ups', () => {
    render(<SellerInboxLead lead={{ ...lead, contact_attempted_at: '2026-10-06T13:00:00Z',
      responded_at: '2026-10-07T12:00:00Z', sellerOutcomeEvents: [
        { id: eventId, event_type: 'customer_replied', occurred_at: '2026-10-07T12:00:00Z', lead_revision: 2, details: {} },
      ] }} timeZone="America/Chicago" />);
    expect(screen.getByRole('button', { name: 'Schedule response' })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Schedule follow-up for reply/ })).toBeEnabled();
  });

  it('hands a newly recorded reply to the scheduler using the latest reread revision', async () => {
    vi.stubGlobal('fetch', vi.fn<typeof fetch>()
      .mockResolvedValueOnce(Response.json({ ok: true, result: { eventId, leadRevision: 4 } }))
      .mockResolvedValueOnce(page([{ ...lead, revision: 5, responded_at: '2026-10-07T12:00:00Z' }])));
    render(<SellerInboxLead lead={lead} timeZone="America/Chicago" />);
    fireEvent.click(screen.getByRole('button', { name: 'Record customer reply' }));
    await waitFor(() => expect(screen.getByRole('dialog', { name: 'Seller schedule' })).toHaveTextContent(`5 · reply:${eventId}`));
  });

  it('reopens an older active consultation with its exact confirmed time and current lead revision', async () => {
    const startsAt = '2026-11-01T01:30:00-06:00';
    const event = { id: eventId, event_type: 'consultation_confirmed', lead_revision: 2,
      occurred_at: startsAt, created_at: '2026-10-07T12:00:00Z', details: {} };
    const fetchMock = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(Response.json({ ok: true, result: { events: [], nextCursor: 'older' } }))
      .mockResolvedValueOnce(Response.json({ ok: true, result: { events: [event], nextCursor: null } }));
    vi.stubGlobal('fetch', fetchMock);
    render(<SellerInboxLead lead={{ ...lead, revision: 9 }} timeZone="America/Chicago" />);
    expect(fetchMock).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Schedule confirmed consultation' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Load older consultations' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Schedule consultation appointment' }));
    expect(screen.getByRole('dialog', { name: 'Seller schedule' })).toHaveTextContent(`9 · consultation:${eventId} · ${startsAt}`);
    expect(fetchMock.mock.calls.every(([url, options]) => String(url).startsWith('/api/realtor/leads/outcomes?') && !options?.method)).toBe(true);
  });

  it('reopens a saved reply follow-up using its receipt and current revision without writing', () => {
    const fetchMock = vi.fn<typeof fetch>();
    vi.stubGlobal('fetch', fetchMock);
    render(<SellerInboxLead lead={{ ...lead, revision: 9, sellerOutcomeEvents: [
      { id: eventId, event_type: 'customer_replied', occurred_at: '2026-10-07T12:00:00Z', lead_revision: 4, details: {} },
      { id, event_type: 'contact_attempted', occurred_at: '2026-10-06T13:00:00Z', lead_revision: 2, details: {} },
    ] }} timeZone="America/Chicago" />);
    expect(screen.getByText('Customer reply')).toBeVisible();
    expect(screen.getByText('Email contact attempt')).toBeVisible();
    expect(screen.getAllByRole('button', { name: /Schedule follow-up for reply/ })).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: /Schedule follow-up for reply/ }));
    expect(screen.getByRole('dialog', { name: 'Seller schedule' })).toHaveTextContent(`9 · reply:${eventId}`);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each(['closed', 'archived'] as const)('disables saved reply follow-ups for a %s request', (status) => {
    render(<SellerInboxLead lead={{ ...lead, status, sellerOutcomeEvents: [
      { id: eventId, event_type: 'customer_replied', occurred_at: '2026-10-07T12:00:00Z', lead_revision: 2, details: {} },
    ] }} timeZone="America/Chicago" />);
    expect(screen.getByRole('button', { name: /Schedule follow-up for reply/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Schedule confirmed consultation' })).toBeDisabled();
  });

  it('keeps reply receipts visible but disables follow-ups after requested contact is revoked', () => {
    render(<SellerInboxLead lead={{ ...lead, metadata: { sellerPlan: { requestedContact: {
      granted: true, capturedAt: '2026-10-06T12:00:00Z', revokedAt: '2026-10-07T13:00:00Z',
    } } }, sellerOutcomeEvents: [
      { id: eventId, event_type: 'customer_replied', occurred_at: '2026-10-07T12:00:00Z', lead_revision: 2, details: {} },
    ] }} timeZone="America/Chicago" />);
    expect(screen.getByText('Customer reply')).toBeVisible();
    expect(screen.getByRole('button', { name: /Schedule follow-up for reply/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Schedule confirmed consultation' })).toBeDisabled();
  });

  it('loads older owned requests and returns to the newest page without admin reads or writes', async () => {
    const fetchMock = vi.fn<typeof fetch>(async (url) => String(url).includes('cursor=older')
      ? page([{ ...lead, id: eventId, name: 'Older Seller' }]) : page([lead], 'older'));
    vi.stubGlobal('fetch', fetchMock);
    render(<SellerInbox timeZone="America/Chicago" />);
    expect(await screen.findByRole('heading', { name: 'Taylor Seller' })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Load older seller requests' }));
    expect(await screen.findByRole('heading', { name: 'Older Seller' })).toBeVisible();
    expect(screen.queryByRole('heading', { name: 'Taylor Seller' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Back to newest requests' }));
    expect(await screen.findByRole('heading', { name: 'Taylor Seller' })).toBeVisible();
    expect(fetchMock.mock.calls.every(([url, init]) => String(url).startsWith('/api/realtor/leads?') && !init?.method)).toBe(true);
  });

  it('distinguishes a failed read from an empty owner page and allows retry', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValueOnce(Response.json({ ok: false }, { status: 503 })).mockResolvedValueOnce(page([]));
    vi.stubGlobal('fetch', fetchMock);
    render(<SellerInbox timeZone="America/Chicago" leadId={id} />);
    expect(await screen.findByRole('alert')).toHaveTextContent('could not be loaded');
    expect(screen.queryByText('This seller request is unavailable to your workspace.')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Retry seller requests' }));
    expect(await screen.findByText('This seller request is unavailable to your workspace.')).toBeVisible();
    expect(screen.getByRole('link', { name: 'Show all seller requests →' })).toHaveAttribute('href', '/seller-inbox');
    expect(String(fetchMock.mock.calls[0][0])).toContain(`leadId=${id}`);
  });

  it('does not display a delayed response from the previously focused request', async () => {
    let oldResponse!: (value: Response) => void;
    const fetchMock = vi.fn<typeof fetch>().mockImplementationOnce(() => new Promise((resolve) => { oldResponse = resolve; })).mockResolvedValueOnce(page([]));
    vi.stubGlobal('fetch', fetchMock);
    const view = render(<SellerInbox timeZone="America/Chicago" leadId={id} />);
    view.rerender(<SellerInbox timeZone="America/Chicago" leadId={eventId} />);
    await screen.findByText('This seller request is unavailable to your workspace.');
    oldResponse(page([lead]));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(fetchMock.mock.calls[0][1]?.signal?.aborted).toBe(true);
    expect(screen.queryByRole('heading', { name: 'Taylor Seller' })).not.toBeInTheDocument();
  });

  it('reports an invalid response without displaying malformed seller data or schema internals', async () => {
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockResolvedValue(page([{ ...lead, revision: 0 }])));
    render(<SellerInbox timeZone="America/Chicago" />);
    expect(await screen.findByRole('alert')).toHaveTextContent('could not be read. Try again.');
    expect(screen.queryByRole('heading', { name: 'Taylor Seller' })).not.toBeInTheDocument();
    expect(screen.getByRole('alert')).not.toHaveTextContent('Zod');
  });

  it('retains an uncertain write key and blocks another write until a saved request can be reread', async () => {
    const fetchMock = vi.fn<typeof fetch>()
      .mockRejectedValueOnce(new Error('Connection interrupted'))
      .mockResolvedValueOnce(Response.json({ ok: true, result: { eventId, leadRevision: 4 } }))
      .mockResolvedValueOnce(Response.json({ ok: false }, { status: 503 }))
      .mockResolvedValueOnce(page([{ ...lead, revision: 4, status: 'archived' }]));
    vi.stubGlobal('fetch', fetchMock);
    render(<SellerInboxLead lead={lead} timeZone="America/Chicago" />);
    fireEvent.click(screen.getByRole('button', { name: 'Record email contact' }));
    await screen.findByText('Connection interrupted');
    fireEvent.click(screen.getByRole('button', { name: 'Record email contact' }));
    await screen.findByRole('button', { name: 'Reload seller request' });
    expect(fetchMock.mock.calls[0][1]?.body).toBe(fetchMock.mock.calls[1][1]?.body);
    expect(screen.getByRole('button', { name: 'Record customer reply' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Reload seller request' }));
    await screen.findByText(/· archived$/);
    expect(screen.getByRole('button', { name: 'Record email contact' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Schedule response' })).toBeDisabled();
    expect(screen.queryByRole('link', { name: 'Open seller email draft' })).not.toBeInTheDocument();
  });

  it('uses the recorded reply identity and committed revision for the follow-up handoff', async () => {
    const fetchMock = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(Response.json({ ok: true, result: { eventId, leadRevision: 4 } }))
      .mockResolvedValueOnce(page([{ ...lead, revision: 4, responded_at: '2026-10-07T12:00:00Z' }]));
    vi.stubGlobal('fetch', fetchMock);
    render(<SellerInboxLead lead={lead} timeZone="America/Chicago" />);
    fireEvent.click(screen.getByRole('button', { name: 'Record customer reply' }));
    await waitFor(() => expect(screen.getByRole('dialog', { name: 'Seller schedule' })).toHaveTextContent(`4 · reply:${eventId}`));
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toMatchObject({ leadId: id, expectedRevision: 3, action: 'record_response', source: 'customer_reply' });
  });

  it('requires a fresh read after a conflict and removes a request when ownership access is lost', async () => {
    const fetchMock = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(Response.json({ ok: false, error: 'Changed; reload.' }, { status: 409 }))
      .mockResolvedValueOnce(page([]));
    vi.stubGlobal('fetch', fetchMock);
    render(<SellerInboxLead lead={lead} timeZone="America/Chicago" />);
    fireEvent.click(screen.getByRole('button', { name: 'Record customer reply' }));
    await screen.findByRole('button', { name: 'Reload seller request' });
    expect(screen.getByRole('button', { name: 'Record customer reply' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Reload seller request' }));
    await screen.findByText('This seller request is no longer available to your workspace.');
    expect(screen.queryByRole('heading', { name: 'Taylor Seller' })).not.toBeInTheDocument();
  });
});
