import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { WeeklyReviewAction } from '@/components/realtor/WeeklyReview';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
const occurrence = { id: 'review', revision: 2, title_snapshot: 'Review the week', effective_date: '2026-10-09' };
const summary = () => Response.json({ result: { seller: { value: { status: 'available', counts: { newRequests: 3, customerReplies: 2, confirmedConsultations: 1, recordedClosings: 0 } } } } });

it.each([
  { status: 'available' },
  { status: 'available', counts: { newRequests: 4 } },
  { status: 'available', counts: { newRequests: -1, customerReplies: 0, confirmedConsultations: 0, recordedClosings: 0 } },
  { status: 'available', counts: { newRequests: '4', customerReplies: 0, confirmedConsultations: 0, recordedClosings: 0 } },
])('does not turn incomplete or invalid seller counts into a zero-activity week', async (value) => {
  vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockResolvedValueOnce(Response.json({ result: { seller: { value } } })).mockResolvedValueOnce(summary()));
  render(<WeeklyReviewAction occurrence={occurrence} busy={false} submit={vi.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: 'Review week' }));
  const retry = await screen.findByRole('button', { name: 'Retry seller outcomes' });
  expect(screen.queryByText(/\d+ requests ·/)).not.toBeInTheDocument();
  fireEvent.click(retry);
  expect(await screen.findByText('3 requests · 2 replies · 1 consultations · 0 closings')).toBeVisible();
});

it('displays an explicitly recorded zero-count week', async () => {
  vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockResolvedValue(Response.json({ result: { seller: { value: {
    status: 'available', counts: { newRequests: 0, customerReplies: 0, confirmedConsultations: 0, recordedClosings: 0 },
  } } } })));
  render(<WeeklyReviewAction occurrence={occurrence} busy={false} submit={vi.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: 'Review week' }));
  expect(await screen.findByText('0 requests · 0 replies · 0 consultations · 0 closings')).toBeVisible();
});

it('reuses an uncertain completion identity, prevents parallel submits, and rotates it for edited evidence', async () => {
  let finish!: (saved: boolean) => void;
  const submit = vi.fn().mockImplementationOnce(() => new Promise<boolean>((resolve) => { finish = resolve; }))
    .mockResolvedValue(false);
  vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockResolvedValue(summary()));
  render(<WeeklyReviewAction occurrence={occurrence} busy={false} submit={submit} />);
  fireEvent.click(screen.getByRole('button', { name: 'Review week' }));
  await screen.findByText('3 requests · 2 replies · 1 consultations · 0 closings');
  screen.getAllByRole('checkbox').forEach((checkbox) => fireEvent.click(checkbox));
  fireEvent.change(screen.getByLabelText('My chosen priority for the week'), { target: { value: 'Follow up' } });
  fireEvent.change(screen.getByLabelText('The next action I will take'), { target: { value: 'Review requests' } });
  const form = screen.getByRole('button', { name: 'Complete review' }).closest('form')!;
  fireEvent.submit(form);
  fireEvent.submit(form);
  expect(submit).toHaveBeenCalledTimes(1);
  expect(screen.getByRole('button', { name: 'Saving…' })).toBeDisabled();
  finish(false);
  await screen.findByRole('button', { name: 'Complete review' });
  fireEvent.submit(form);
  await waitFor(() => expect(submit).toHaveBeenCalledTimes(2));
  expect(submit.mock.calls[1][2]).toEqual(submit.mock.calls[0][2]);
  await waitFor(() => expect(screen.getByRole('button', { name: 'Complete review' })).toBeEnabled());
  fireEvent.change(screen.getByLabelText('The next action I will take'), { target: { value: 'Schedule replies' } });
  fireEvent.submit(form);
  await waitFor(() => expect(submit).toHaveBeenCalledTimes(3));
  expect(submit.mock.calls[2][2].requestKey).not.toBe(submit.mock.calls[0][2].requestKey);
  expect(submit.mock.calls[2][2].completionDetails.weeklyReview.chosenNextAction).toBe('Schedule replies');
});

it('retries unavailable seller counts without losing the review draft and links to the personal inbox', async () => {
  const fetchMock = vi.fn<typeof fetch>().mockResolvedValueOnce(new Response(null, { status: 503 })).mockResolvedValueOnce(summary());
  const submit = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
  render(<WeeklyReviewAction occurrence={occurrence} busy={false} submit={submit} />);
  fireEvent.click(screen.getByRole('button', { name: 'Review week' }));
  fireEvent.change(screen.getByLabelText('My chosen priority for the week'), { target: { value: 'Follow up personally' } });
  fireEvent.click(await screen.findByRole('button', { name: 'Retry seller outcomes' }));
  expect(await screen.findByText('3 requests · 2 replies · 1 consultations · 0 closings')).toBeVisible();
  expect(screen.getByLabelText('My chosen priority for the week')).toHaveValue('Follow up personally');
  expect(screen.getByRole('link', { name: 'Open seller inbox' })).toHaveAttribute('href', '/seller-inbox');
  expect(submit).not.toHaveBeenCalled();
});

it('aborts a closed review read and discards its delayed summary after reopening', async () => {
  let resolveOld!: (value: Response) => void;
  const fetchMock = vi.fn<typeof fetch>().mockImplementationOnce(() => new Promise((resolve) => { resolveOld = resolve; })).mockResolvedValueOnce(summary());
  vi.stubGlobal('fetch', fetchMock);
  render(<WeeklyReviewAction occurrence={occurrence} busy={false} submit={vi.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: 'Review week' }));
  expect(screen.getByText('Loading recorded seller outcomes…')).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
  expect(fetchMock.mock.calls[0][1]?.signal?.aborted).toBe(true);
  fireEvent.click(screen.getByRole('button', { name: 'Review week' }));
  await screen.findByText('3 requests · 2 replies · 1 consultations · 0 closings');
  resolveOld(Response.json({ result: { seller: { value: { status: 'available', counts: { newRequests: 99 } } } } }));
  await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
  expect(screen.queryByText(/99 requests/)).not.toBeInTheDocument();
});
