import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ApplyVibePage from '@/app/vibes/[vibeId]/apply/page';

vi.mock('next/navigation', () => ({ useParams: () => ({ vibeId: 'coastal' }) }));
vi.mock('next/link', () => ({ default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a> }));

describe('ApplyVibePage preflight', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    HTMLDialogElement.prototype.showModal = vi.fn();
    HTMLDialogElement.prototype.close = vi.fn();
  });

  it('requires a pointer check for the current site and invalidates stale results', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ revision: { revisionId: 'current-revision', revisionNumber: 2 } }),
    }));
    render(<ApplyVibePage />);

    const site = screen.getByRole('textbox', { name: 'Site ID' });
    const revision = screen.getByRole('textbox', { name: 'Published revision ID' });
    const apply = screen.getByRole('button', { name: 'Apply revision' });

    fireEvent.change(site, { target: { value: 'site-a' } });
    fireEvent.change(revision, { target: { value: 'new-revision' } });
    expect(apply).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'Check current site pointer' }));
    await waitFor(() => expect(apply).toBeEnabled());
    expect(screen.getAllByText('current-revision').length).toBeGreaterThan(0);

    fireEvent.change(site, { target: { value: 'site-b' } });
    expect(apply).toBeDisabled();
    expect(screen.queryByText('current-revision')).not.toBeInTheDocument();
  });
});
