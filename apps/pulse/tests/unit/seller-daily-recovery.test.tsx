import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { SellerDailyPanel } from '@/components/realtor/SellerDailyPanel';
import { sellerDailyFixture } from '../fixtures/sellerDailyFixture';
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
afterEach(() => vi.unstubAllGlobals());
it('recovers when Today supplied no seller result at all', async () => {
  vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockResolvedValue(Response.json({ ok: true, result: {
    seller: { status: 'available', value: sellerDailyFixture() },
  } })));
  render(<SellerDailyPanel />);
  fireEvent.click(screen.getByRole('button', { name: 'Retry seller activity' }));
  expect(await screen.findByText('No seller requests need an initial response.')).toBeInTheDocument();
});
it.each([
  { status: 'available' },
  { ...sellerDailyFixture(), counts: { newRequests: -1 } },
  { ...sellerDailyFixture(), unscheduledRequests: undefined },
  { ...sellerDailyFixture(), timeZone: 'Invalid/Zone' },
])('treats malformed summaries as unavailable rather than empty work', (value) => {
  render(<SellerDailyPanel result={{ status: 'available', value }} />);
  expect(screen.getByRole('button', { name: 'Retry seller activity' })).toBeInTheDocument();
  expect(screen.queryByText('No seller requests need an initial response.')).not.toBeInTheDocument();
  expect(screen.queryByText('No overdue seller actions.')).not.toBeInTheDocument();
});
it('blocks overlapping reads, retains failure recovery, and displays genuine empty work after retry', async () => {
  let finish!: (response: Response) => void;
  const fetchMock = vi.fn<typeof fetch>().mockImplementationOnce(() => new Promise<Response>((resolve) => { finish = resolve; }))
    .mockResolvedValueOnce(Response.json({ ok: true, result: { seller: { status: 'available', value: sellerDailyFixture() } } }));
  vi.stubGlobal('fetch', fetchMock);
  render(<SellerDailyPanel result={{ status: 'unavailable' }} />);
  fireEvent.click(screen.getByRole('button', { name: 'Retry seller activity' }));
  expect(screen.getByRole('button', { name: 'Reloading seller activity…' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Reloading seller activity…' }));
  expect(fetchMock).toHaveBeenCalledOnce();
  await act(async () => finish(Response.json({ ok: false }, { status: 503 })));
  expect(screen.getByRole('alert')).toHaveTextContent('could not be reloaded');
  fireEvent.click(screen.getByRole('button', { name: 'Retry seller activity' }));
  expect(await screen.findByText('No seller requests need an initial response.')).toBeInTheDocument();
  expect(fetchMock.mock.calls.every(([url, options]) => url === '/api/realtor/today' && options?.method === undefined)).toBe(true);
});
it('aborts a retry when fresh parent data arrives and ignores the delayed response', async () => {
  let finish!: (response: Response) => void;
  const fetchMock = vi.fn<typeof fetch>(() => new Promise<Response>((resolve) => { finish = resolve; }));
  vi.stubGlobal('fetch', fetchMock);
  const onAgendaReloaded = vi.fn();
  const view = render(<SellerDailyPanel result={{ status: 'unavailable' }} onAgendaReloaded={onAgendaReloaded} />);
  fireEvent.click(screen.getByRole('button', { name: 'Retry seller activity' }));
  view.rerender(<SellerDailyPanel result={{ status: 'available', value: sellerDailyFixture({ counts: {
    newRequests: 2, customerReplies: 0, confirmedConsultations: 0, recordedClosings: 0,
  } }) }} />);
  expect(fetchMock.mock.calls[0][1]?.signal?.aborted).toBe(true);
  await act(async () => finish(Response.json({ ok: true, result: { seller: { status: 'available', value: sellerDailyFixture({ counts: {
    newRequests: 99, customerReplies: 0, confirmedConsultations: 0, recordedClosings: 0,
  } }) } } })));
  await waitFor(() => expect(screen.getByText('2')).toBeInTheDocument());
  expect(screen.queryByText('99')).not.toBeInTheDocument();
  expect(onAgendaReloaded).not.toHaveBeenCalled();
});
