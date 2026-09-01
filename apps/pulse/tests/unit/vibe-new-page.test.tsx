import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import NewVibePage from '@/app/vibes/new/page';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('next/link', () => ({ default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a> }));

describe('NewVibePage', () => {
  it('renders the identity fields and slug guidance', () => {
    render(<NewVibePage />);
    expect(screen.getByRole('heading', { name: 'Add New Vibe' })).toBeInTheDocument();
    expect(screen.getAllByRole('textbox')).toHaveLength(3);
    expect(screen.getByText(/identifies the Vibe, not a public site URL/)).toBeInTheDocument();
  });
});
