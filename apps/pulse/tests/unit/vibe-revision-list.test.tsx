import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RevisionList } from '@/app/vibes/[vibeId]/revisions/RevisionList';

vi.mock('next/link', () => ({ default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a> }));

const revisionResponse = {
  publishedRevisionId: 'revision-2',
  revisions: [
    { _id: 'revision-2', revisionNumber: 2, parentRevisionId: 'revision-1', publishedAt: '2026-10-18T10:00:00.000Z' },
    { _id: 'revision-1', revisionNumber: 1, publishedAt: '2026-10-17T10:00:00.000Z' },
  ],
};

describe('Vibe revision history', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) { this.setAttribute('open', ''); });
    HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) { this.removeAttribute('open'); });
  });

  it('collects the republish reason in the confirmation dialog and sends it with the rollback request', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => revisionResponse })
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) })
      .mockResolvedValueOnce({ ok: true, json: async () => revisionResponse });
    vi.stubGlobal('fetch', fetchMock);

    render(<RevisionList vibeId="sunset-home" />);
    await screen.findByText('Current published');
    fireEvent.click(screen.getByRole('button', { name: 'Republish revision' }));

    const dialog = screen.getByRole('dialog');
    expect(HTMLDialogElement.prototype.showModal).toHaveBeenCalledOnce();
    const confirm = within(dialog).getByRole('button', { name: 'Republish revision' });
    const reason = within(dialog).getByRole('textbox', { name: 'Reason for republishing' });
    expect(confirm).toBeDisabled();
    fireEvent.change(reason, { target: { value: 'Restore the approved wording after the newer draft was published.' } });
    expect(confirm).toBeEnabled();
    fireEvent.click(confirm);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
    expect(fetchMock.mock.calls[1][0]).toBe('/api/vibes/sunset-home/rollback');
    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toMatchObject({
      revisionId: 'revision-1',
      reason: 'Restore the approved wording after the newer draft was published.',
    });
    expect(await screen.findByRole('status')).toHaveTextContent('r1 was republished as a new published revision.');
  });
});
