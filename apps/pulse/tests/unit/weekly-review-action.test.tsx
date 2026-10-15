import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { WeeklyReviewAction } from '@/components/realtor/WeeklyReview';

describe('weekly seller business review', () => {
  it('shows recorded outcomes and submits versioned evidence with the chosen action', async () => {
    const submit = vi.fn().mockResolvedValue(true);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ result: { seller: { value: {
      status: 'available', counts: { newRequests: 2, customerReplies: 1, confirmedConsultations: 1, recordedClosings: 0 },
      firstContactTiming: { medianSeconds: 600, sampleSize: 2 }, campaigns: [],
    } } } }) }));
    render(<WeeklyReviewAction occurrence={{ id: 'task-1', revision: 2, title_snapshot: 'Review business', effective_date: '2026-10-05' }} busy={false} submit={submit} />);
    fireEvent.click(screen.getByRole('button', { name: 'Review week' }));
    await screen.findByText(/2 requests · 1 replies · 1 consultations · 0 closings/);
    const checks = screen.getAllByRole('checkbox');
    checks.forEach((checkbox) => fireEvent.click(checkbox));
    const fields = screen.getAllByRole('textbox');
    fireEvent.change(fields[0], { target: { value: 'Improve response time' } });
    fireEvent.change(fields[1], { target: { value: 'Call opted-in sellers' } });
    fireEvent.change(fields[2], { target: { value: 'A photo delay slowed one listing' } });
    fireEvent.click(screen.getByRole('button', { name: 'Complete review' }));
    await waitFor(() => expect(submit).toHaveBeenCalledOnce());
    expect(submit.mock.calls[0][2]).toMatchObject({ completionDetails: { weeklyReview: {
      version: 2, reviewedSellerOutcomes: true, priority: 'Improve response time',
      chosenNextAction: 'Call opted-in sellers', friction: 'A photo delay slowed one listing',
    } } });
  });
});
