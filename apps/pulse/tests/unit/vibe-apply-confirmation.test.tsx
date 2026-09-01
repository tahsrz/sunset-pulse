import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { VibeApplyConfirmation } from '@/app/vibes/_components/VibeApplyConfirmation';

vi.mock('next/link', () => ({ default: ({ children }: { children: ReactNode }) => <>{children}</> }));

describe('VibeApplyConfirmation', () => {
  it('renders the exact site, vibe, and revision context', () => {
    render(<VibeApplyConfirmation open siteId="cms-verification-run-1" vibeId="coastal" revisionId="rev-7" onConfirm={() => undefined} onOpenChange={() => undefined} />);
    expect(screen.getByText(/cms-verification-run-1/)).toBeTruthy();
    expect(screen.getByText(/rev-7/)).toBeTruthy();
    expect(screen.getByText(/coastal/)).toBeTruthy();
  });
});
