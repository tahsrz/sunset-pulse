import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PlannerReminderActions } from '@/components/realtor/PlannerReminderActions';

const reminder = { id: 'reminder', revision: 2 };
const defaults = { reminder, busy: false, dueDate: '2025-12-31', onReload: vi.fn(async () => true) };
afterEach(() => vi.restoreAllMocks());

describe('planner reminder actions', () => {
  it('pauses both actions after a conflict and keeps them paused after a failed refresh', async () => {
    const submit = vi.fn().mockResolvedValue('conflict');
    const onReload = vi.fn().mockResolvedValue(false);
    render(<PlannerReminderActions {...defaults} submit={submit} onReload={onReload} />);
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss reminder' }));
    await screen.findByText('This reminder changed. Refresh reminders before making another change.');
    expect(screen.getByRole('button', { name: 'Dismiss reminder' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Snooze 24 hours' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss reminder' }));
    expect(submit).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole('button', { name: 'Refresh reminders' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('could not be refreshed');
    expect(screen.getByRole('button', { name: 'Dismiss reminder' })).toBeDisabled();
  });

  it('resumes a conflicted reminder with the refreshed revision and a fresh identity', async () => {
    const submit = vi.fn().mockResolvedValueOnce('conflict').mockResolvedValueOnce(true);
    const view = render(<PlannerReminderActions {...defaults} submit={submit} />);
    fireEvent.click(screen.getByRole('button', { name: 'Snooze 24 hours' }));
    await screen.findByText('This reminder changed. Refresh reminders before making another change.');
    view.rerender(<PlannerReminderActions {...defaults} reminder={{ ...reminder, revision: 3 }} submit={submit} />);
    expect(screen.queryByText('This reminder changed. Refresh reminders before making another change.')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Snooze 24 hours' }));
    await waitFor(() => expect(submit).toHaveBeenCalledTimes(2));
    expect(submit.mock.calls[1][2].expectedRevision).toBe(3);
    expect(submit.mock.calls[1][2].requestKey).not.toBe(submit.mock.calls[0][2].requestKey);
  });

  it('retries an uncertain snooze with the same identity and deadline after time passes', async () => {
    const clock = vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-10-08T15:00:00Z'));
    const submit = vi.fn().mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    render(<PlannerReminderActions {...defaults} submit={submit} />);
    fireEvent.click(screen.getByRole('button', { name: 'Snooze 24 hours' }));
    await screen.findByText(/reminder change could not be confirmed/i);
    expect(screen.getByRole('button', { name: 'Dismiss reminder' })).toBeDisabled();
    clock.mockReturnValue(Date.parse('2026-10-08T17:00:00Z'));
    fireEvent.click(screen.getByRole('button', { name: 'Snooze 24 hours' }));
    await waitFor(() => expect(submit).toHaveBeenCalledTimes(2));
    expect(submit.mock.calls[1]).toEqual(submit.mock.calls[0]);
    expect(submit.mock.calls[0]).toEqual(['/api/realtor/reminders', 'PATCH', {
      reminderId: 'reminder', action: 'snooze', expectedRevision: 2, requestKey: expect.any(String), until: '2026-10-09T15:00:00.000Z',
    }, 'Reminder snoozed for 24 hours.']);
    await waitFor(() => expect(screen.queryByText(/reminder change could not be confirmed/i)).not.toBeInTheDocument());
  });

  it('retains a rejected dismissal identity and omits snooze fields', async () => {
    const submit = vi.fn().mockRejectedValueOnce(new Error('Disconnected')).mockResolvedValueOnce(true);
    render(<PlannerReminderActions {...defaults} submit={submit} />);
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss reminder' }));
    await screen.findByText(/reminder change could not be confirmed/i);
    expect(screen.getByRole('button', { name: 'Snooze 24 hours' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss reminder' }));
    await waitFor(() => expect(submit).toHaveBeenCalledTimes(2));
    expect(submit.mock.calls[1]).toEqual(submit.mock.calls[0]);
    expect(submit.mock.calls[0][2]).not.toHaveProperty('until');
  });

  it('blocks overlapping actions before parent busy state updates', async () => {
    let finish!: (result: boolean) => void;
    const submit = vi.fn(() => new Promise<boolean>((resolve) => { finish = resolve; }));
    render(<PlannerReminderActions {...defaults} submit={submit} />);
    const dismiss = screen.getByRole('button', { name: 'Dismiss reminder' });
    const snooze = screen.getByRole('button', { name: 'Snooze 24 hours' });
    act(() => {
      dismiss.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      snooze.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(submit).toHaveBeenCalledOnce();
    expect(screen.getByRole('button', { name: 'Dismissing…' })).toBeDisabled();
    expect(snooze).toBeDisabled();
    await act(async () => finish(true));
  });

  it('uses the fresh reminder revision and a different identity after a reread', async () => {
    const submit = vi.fn().mockResolvedValue(false);
    const view = render(<PlannerReminderActions {...defaults} submit={submit} />);
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss reminder' }));
    await screen.findByText(/reminder change could not be confirmed/i);
    view.rerender(<PlannerReminderActions {...defaults} reminder={{ ...reminder, revision: 3 }} submit={submit} />);
    expect(screen.queryByText(/reminder change could not be confirmed/i)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss reminder' }));
    await waitFor(() => expect(submit).toHaveBeenCalledTimes(2));
    expect(submit.mock.calls[1][2].expectedRevision).toBe(3);
    expect(submit.mock.calls[1][2].requestKey).not.toBe(submit.mock.calls[0][2].requestKey);
  });

  it('keeps an uncertain action after a failed reload and releases it only after a successful read', async () => {
    const onReload = vi.fn().mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    const submit = vi.fn().mockResolvedValue(false);
    render(<PlannerReminderActions {...defaults} onReload={onReload} submit={submit} />);
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss reminder' }));
    await screen.findByText(/reminder change could not be confirmed/i);
    fireEvent.click(screen.getByRole('button', { name: 'Refresh reminders' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('could not be refreshed');
    expect(screen.getByRole('button', { name: 'Snooze 24 hours' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Refresh reminders' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Snooze 24 hours' })).toBeEnabled());
    expect(submit).toHaveBeenCalledOnce();
    expect(onReload).toHaveBeenCalledTimes(2);
  });

  it.each([
    ['2025-12-31', '/planner?date=2025-12-31'],
    ['2026-02-30', '/planner'],
    [null, '/planner'],
  ])('opens a validated due-date planner for %s without performing a write', (dueDate, href) => {
    const submit = vi.fn();
    render(<PlannerReminderActions {...defaults} dueDate={dueDate} submit={submit} />);
    expect(screen.getByRole('link', { name: 'Open reminder task' })).toHaveAttribute('href', href);
    expect(submit).not.toHaveBeenCalled();
  });
});
