import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { PlannerCompleteAction } from '@/components/realtor/PlannerCompleteAction';

afterEach(cleanup);
const occurrence = { id: 'task', revision: 3 };
it('retries uncertain completion with the same identity and blocks parallel submissions', async () => {
  let finish!: (saved: boolean) => void;
  const submit = vi.fn().mockImplementationOnce(() => new Promise<boolean>((resolve) => { finish = resolve; })).mockResolvedValueOnce(true);
  render(<PlannerCompleteAction occurrence={occurrence} busy={false} submit={submit} />);
  fireEvent.click(screen.getByRole('button', { name: 'Mark complete' }));
  expect(screen.getByRole('button', { name: 'Completing…' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Completing…' }));
  expect(submit).toHaveBeenCalledTimes(1);
  finish(false);
  fireEvent.click(await screen.findByRole('button', { name: 'Mark complete' }));
  await waitFor(() => expect(submit).toHaveBeenCalledTimes(2));
  expect(submit.mock.calls[1]).toEqual(submit.mock.calls[0]);
  expect(submit.mock.calls[0][2]).toMatchObject({ action: 'complete', expectedRevision: 3, requestKey: expect.any(String) });
});
it('uses a different request identity after the saved occurrence revision changes', async () => {
  const submit = vi.fn().mockResolvedValue(false);
  const view = render(<PlannerCompleteAction occurrence={occurrence} busy={false} submit={submit} />);
  fireEvent.click(screen.getByRole('button', { name: 'Mark complete' }));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Mark complete' })).toBeEnabled());
  view.rerender(<PlannerCompleteAction occurrence={{ ...occurrence, revision: 4 }} busy={false} submit={submit} />);
  fireEvent.click(screen.getByRole('button', { name: 'Mark complete' }));
  await waitFor(() => expect(submit).toHaveBeenCalledTimes(2));
  expect(submit.mock.calls[1][2].requestKey).not.toBe(submit.mock.calls[0][2].requestKey);
  expect(submit.mock.calls[1][2].expectedRevision).toBe(4);
});
it('keeps a retryable error after a rejected promise and preserves its identity', async () => {
  const submit = vi.fn().mockRejectedValueOnce(new Error('Lost response')).mockResolvedValueOnce(true);
  render(<PlannerCompleteAction occurrence={occurrence} busy={false} submit={submit} />);
  fireEvent.click(screen.getByRole('button', { name: 'Mark complete' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('could not be confirmed');
  fireEvent.click(screen.getByRole('button', { name: 'Mark complete' }));
  await waitFor(() => expect(submit).toHaveBeenCalledTimes(2));
  expect(submit.mock.calls[1]).toEqual(submit.mock.calls[0]);
});
