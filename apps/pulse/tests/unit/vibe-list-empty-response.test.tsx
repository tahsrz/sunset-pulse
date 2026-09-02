import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { VibeList } from '@/app/vibes/VibeList';

vi.mock('next/navigation', () => ({
  usePathname: () => '/vibes',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock('next/link', () => ({ default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a> }));

describe('VibeList empty response handling', () => {
  it('renders the empty state when the API returns an empty successful body', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, text: async () => '' }));
    render(<VibeList />);
    await waitFor(() => expect(screen.getByText(/No vibes found/i)).toBeInTheDocument());
  });
});
