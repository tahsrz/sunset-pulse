import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import React, { type ReactNode } from 'react';
import { VibeApplyConfirmation } from '@/app/vibes/_components/VibeApplyConfirmation';

vi.mock('next/link', () => ({ default: ({ children }: { children: ReactNode }) => <>{children}</> }));

describe('VibeApplyConfirmation', () => {
  it('renders the exact site, vibe, and revision context', () => {
    HTMLDialogElement.prototype.showModal = vi.fn();
    HTMLDialogElement.prototype.close = vi.fn();
    render(<VibeApplyConfirmation open siteId="cms-verification-run-1" vibeId="coastal" revisionId="rev-7" onConfirm={() => undefined} onOpenChange={() => undefined} />);
    expect(screen.getByText(/cms-verification-run-1/)).toBeTruthy();
    expect(screen.getByText(/rev-7/)).toBeTruthy();
    expect(screen.getByText(/coastal/)).toBeTruthy();
  });

  it('submits at most once for a single dialog opening', () => {
    HTMLDialogElement.prototype.showModal = vi.fn();
    HTMLDialogElement.prototype.close = vi.fn();
    const onConfirm = vi.fn();
    render(<VibeApplyConfirmation open siteId="site-a" vibeId="coastal" revisionId="rev-7" onConfirm={onConfirm} onOpenChange={() => undefined} />);
    const confirm = screen.getByRole('button', { name: 'Apply revision', hidden: true });
    fireEvent.click(confirm);
    fireEvent.click(confirm);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});
