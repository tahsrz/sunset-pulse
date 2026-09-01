import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { VibePageHeader } from '@/app/vibes/_components/VibePageHeader';

vi.mock('next/link', () => ({ default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a> }));

describe('VibePageHeader', () => {
  it('renders title, context, back link, and actions', () => {
    render(<VibePageHeader title="Revision history" description="Immutable checkpoints" backHref="/vibes/demo/edit" backLabel="Back to Vibe" actions={<button type="button">Apply</button>} />);
    expect(screen.getByRole('heading', { name: 'Revision history' })).toBeInTheDocument();
    expect(screen.getByText('Immutable checkpoints')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Back to Vibe/ })).toHaveAttribute('href', '/vibes/demo/edit');
    expect(screen.getByRole('button', { name: 'Apply' })).toBeInTheDocument();
  });
});
