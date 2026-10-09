import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import RealtorWorkspace from '@/components/realtor/RealtorWorkspace';
import { sellerDailyFixture } from '../fixtures/sellerDailyFixture';
import { todayAgendaFixture, todayOccurrenceFixture } from '../fixtures/todayAgendaFixture';

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock('@/components/realtor/SellerLeadScheduleDialog', () => ({
  SellerLeadScheduleDialog: ({ onSaved }: { onSaved: () => void }) => <button onClick={onSaved}>Confirm test schedule</button>,
}));
afterEach(() => vi.unstubAllGlobals());
const preferences = { workspace_id: '22222222-2222-4222-8222-222222222222', time_zone: 'America/Chicago',
  reminders_enabled: true, gamification_enabled: false, celebrations_enabled: false, hide_amounts_on_today: false,
  records_start_date: null, revision: 1 };
const initial = () => ({ agenda: todayAgendaFixture(), business: { status: 'available', value: { recordedNetCents: 12500 } },
  goals: { status: 'available', value: [] }, seller: { status: 'available', value: sellerDailyFixture({
    unscheduledRequests: [{ id: '33333333-3333-4333-8333-333333333333', name: 'Taylor Seller', revision: 1,
      created_at: '2026-10-08T15:00:00Z', timing: null }],
  }) } });
function installReads(reads: Array<Response>) {
  let todayReads = 0;
  const fetchMock = vi.fn<typeof fetch>(async (url) => {
    if (url === '/api/realtor/preferences') return Response.json({ ok: true, result: preferences });
    if (url === '/api/workspaces') return Response.json({ ok: true, workspaces: [] });
    if (url === '/api/realtor/today') {
      todayReads++;
      if (todayReads === 1) return Response.json({ ok: true, result: initial() });
      const response = reads.shift();
      if (!response) throw new Error('Unexpected read');
      return response;
    }
    throw new Error('Unexpected endpoint');
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}
async function saveSchedule() {
  render(<RealtorWorkspace section="today" />);
  fireEvent.click(await screen.findByRole('button', { name: 'Schedule response' }));
  fireEvent.click(screen.getByRole('button', { name: 'Confirm test schedule' }));
}
const fresh = (agenda: unknown) => Response.json({ ok: true, result: {
  agenda, seller: { status: 'available', value: sellerDailyFixture() },
  business: { status: 'unavailable' }, goals: { status: 'unavailable' },
} });

it('uses the post-save seller read to refresh agenda and reminders without replacing business data', async () => {
  const occurrence = todayOccurrenceFixture();
  occurrence.seller_source_available = true;
  occurrence.seller_lead = { id: '33333333-3333-4333-8333-333333333333', name: 'Taylor Seller', revision: 1, status: 'new' };
  const agenda = todayAgendaFixture({ upcoming: [occurrence], reminders: [{
    id: '44444444-4444-4444-8444-444444444444', occurrence_id: occurrence.id,
    scheduled_at: '2026-10-08T15:00:00+00:00', status: 'visible', revision: 2,
    occurrence: { ...occurrence, title_snapshot: 'Existing delivered reminder' },
  }] });
  const fetchMock = installReads([fresh(agenda)]);
  await saveSchedule();
  expect(await screen.findByText('Respond to Taylor Seller')).toBeInTheDocument();
  expect(screen.getByText('follow up · 2026-10-09 · 10:15 (America/Chicago)')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Open planner task' })).toHaveAttribute('href', '/planner?date=2026-10-09');
  expect(screen.getByRole('link', { name: 'Open seller request' })).toHaveAttribute('href', '/seller-inbox?leadId=33333333-3333-4333-8333-333333333333');
  expect(screen.getByText('Existing delivered reminder')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Open reminder task' })).toHaveAttribute('href', '/planner?date=2026-10-09');
  expect(screen.getByText('USD 125.00')).toBeInTheDocument();
  expect(screen.queryByText(/Schedule changed/)).not.toBeInTheDocument();
  expect(fetchMock.mock.calls.filter(([url]) => url === '/api/realtor/today')).toHaveLength(2);
});

it.each([{ status: 'unavailable' }, { status: 'available', value: { upcoming: [] } }])(
  'retains schedule recovery when the seller read succeeds but the agenda is unavailable or malformed', async (agenda) => {
    installReads([fresh(agenda), fresh(todayAgendaFixture({ upcoming: [todayOccurrenceFixture()] }))]);
    await saveSchedule();
    expect(await screen.findByText('No seller requests need an initial response.')).toBeInTheDocument();
    expect(screen.getByText(/Schedule changed/)).toBeInTheDocument();
    expect(screen.getByText('USD 125.00')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Refresh schedule' }));
    expect(await screen.findByText('Respond to Taylor Seller')).toBeInTheDocument();
    expect(screen.getByText('USD 125.00')).toBeInTheDocument();
    expect(screen.queryByText(/Schedule changed/)).not.toBeInTheDocument();
  },
);

it('keeps the stale notice through failed and malformed refreshes, then recovers with read-only retries', async () => {
  const fetchMock = installReads([
    Response.json({ ok: false }, { status: 503 }), fresh({ status: 'available', value: {} }),
    fresh(todayAgendaFixture({ upcoming: [todayOccurrenceFixture()] })),
  ]);
  await saveSchedule();
  expect(await screen.findByText('Seller activity could not be reloaded. Try again.')).toBeInTheDocument();
  expect(screen.getByText(/Schedule changed/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Refresh schedule' }));
  await waitFor(() => expect(screen.getByText('Your schedule could not be refreshed. Try again.')).toBeInTheDocument());
  expect(screen.getByText('USD 125.00')).toBeInTheDocument();
  expect(screen.getByText(/Schedule changed/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Refresh schedule' }));
  expect(await screen.findByText('Respond to Taylor Seller')).toBeInTheDocument();
  expect(screen.queryByText(/Schedule changed/)).not.toBeInTheDocument();
  expect(fetchMock.mock.calls.every(([, options]) => options?.method === undefined)).toBe(true);
});
