import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SellerInboxLead } from '@/components/realtor/SellerInboxLead';
import type { OwnedSellerLead } from '@/lib/realtor-workspace/leadContracts';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
const lead: OwnedSellerLead = {
  id: '11111111-1111-4111-8111-111111111111', revision: 3, source: 'seller_plan', created_at: '2026-10-06T12:00:00Z',
  agent_id: 'seller-site', site: 'seller-site', name: 'Taylor Seller', email: 'taylor@example.test',
  message: 'Please prepare a seller plan.', status: 'new', contact_attempted_at: null, responded_at: null,
  metadata: { sellerPlan: { requestedContact: { granted: true, capturedAt: '2026-10-06T12:00:00Z' } } },
  sellerOutcomeEvents: [],
};
const page = (leads: OwnedSellerLead[]) => Response.json({ ok: true, result: { leads, nextCursor: null } });

describe('seller inbox scheduling recovery', () => {
  it('keeps a scheduling draft through conflict and failed reload, then saves at the refreshed revision', async () => {
    let reads = 0;
    let saves = 0;
    const fetchMock = vi.fn<typeof fetch>(async (url, options) => {
      if (String(url).startsWith('/api/realtor/leads/schedule?')) return Response.json({ ok: true, result: null });
      if (options?.method === 'POST') {
        saves += 1;
        return saves === 1 ? Response.json({ ok: false, error: 'Seller request changed.' }, { status: 409 }) : Response.json({ ok: true });
      }
      reads += 1;
      return reads === 1 ? Response.json({ ok: false }, { status: 503 }) : page([{ ...lead, revision: 4 }]);
    });
    vi.stubGlobal('fetch', fetchMock);
    render(<SellerInboxLead lead={lead} timeZone="America/Chicago" />);
    fireEvent.click(screen.getByRole('button', { name: 'Schedule response' }));
    const dialog = within(screen.getByRole('dialog', { name: 'Schedule seller response' }));
    fireEvent.change(dialog.getByLabelText('Date'), { target: { value: '2027-03-13' } });
    fireEvent.change(dialog.getByLabelText('Time'), { target: { value: '16:45' } });
    fireEvent.click(dialog.getByLabelText('Remind me at the scheduled time'));
    await waitFor(() => expect(dialog.getByRole('button', { name: 'Schedule response' })).toBeEnabled());
    fireEvent.click(dialog.getByRole('button', { name: 'Schedule response' }));
    await dialog.findByText('Scheduling is paused until the seller request is available and current.');
    expect(dialog.getByRole('button', { name: 'Schedule response' })).toBeDisabled();
    fireEvent.click(dialog.getByRole('button', { name: 'Reload seller request' }));
    await dialog.findByText('Could not reload this seller request. Try reloading again.');
    expect(dialog.getByRole('button', { name: 'Schedule response' })).toBeDisabled();
    expect(saves).toBe(1);
    fireEvent.click(dialog.getByRole('button', { name: 'Reload seller request' }));
    await waitFor(() => expect(dialog.getByRole('button', { name: 'Schedule response' })).toBeEnabled());
    expect(dialog.getByLabelText('Date')).toHaveValue('2027-03-13');
    expect(dialog.getByLabelText('Time')).toHaveValue('16:45');
    expect(dialog.getByLabelText('Remind me at the scheduled time')).not.toBeChecked();
    fireEvent.click(dialog.getByRole('button', { name: 'Schedule response' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    const writes = fetchMock.mock.calls.filter(([, options]) => options?.method === 'POST');
    expect(writes).toHaveLength(2);
    const first = JSON.parse(String(writes[0][1]?.body));
    const second = JSON.parse(String(writes[1][1]?.body));
    expect(second.item.sellerLead.expectedLeadRevision).toBe(4);
    expect(second.item.due).toMatchObject({ anchorDate: '2027-03-13', localTime: '16:45', reminderOffsetsDays: [] });
    expect(second.item.requestKey).not.toBe(first.item.requestKey);
  });

  it.each(['permission revoked', 'archived', 'unavailable'] as const)('dismisses an invalid draft when a reload finds the request %s', async (state) => {
    const refreshed = state === 'unavailable' ? [] : [{ ...lead, revision: 4,
      ...(state === 'archived' ? { status: 'archived' as const } : { metadata: { sellerPlan: { requestedContact: {
        granted: true, capturedAt: '2026-10-06T12:00:00Z', revokedAt: '2026-10-08T12:00:00Z',
      } } } }),
    }];
    const fetchMock = vi.fn<typeof fetch>(async (url, options) => String(url).startsWith('/api/realtor/leads/schedule?')
      ? Response.json({ ok: true, result: null }) : options?.method === 'POST'
        ? Response.json({ ok: false, error: 'Seller request changed.' }, { status: 409 }) : page(refreshed));
    vi.stubGlobal('fetch', fetchMock);
    render(<SellerInboxLead lead={lead} timeZone="America/Chicago" />);
    fireEvent.click(screen.getByRole('button', { name: 'Schedule response' }));
    const dialog = within(screen.getByRole('dialog', { name: 'Schedule seller response' }));
    await waitFor(() => expect(dialog.getByRole('button', { name: 'Schedule response' })).toBeEnabled());
    fireEvent.click(dialog.getByRole('button', { name: 'Schedule response' }));
    fireEvent.click(await dialog.findByRole('button', { name: 'Reload seller request' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(fetchMock.mock.calls.filter(([, options]) => options?.method === 'POST')).toHaveLength(1);
    if (state === 'unavailable') expect(screen.getByRole('status')).toHaveTextContent('no longer available');
    else expect(screen.getByRole('button', { name: 'Schedule response' })).toBeDisabled();
  });
});
