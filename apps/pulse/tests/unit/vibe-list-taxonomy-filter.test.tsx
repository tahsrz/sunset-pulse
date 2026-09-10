import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { VibeList } from '@/app/vibes/VibeList';

const push = vi.fn();

vi.mock('next/navigation', () => ({
  usePathname: () => '/vibes',
  useRouter: () => ({ push, replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams('taxonomyTerm=mood%3Acalm'),
}));
vi.mock('next/link', () => ({ default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a> }));

describe('VibeList taxonomy filtering', () => {
  it('loads the selected taxonomy term and can clear the URL filter', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify({ vibes: [{ vibeId: 'coastal', title: 'Coastal', taxonomyTermIds: ['mood:calm', 'visualFamily:editorial'] }], total: 1, totalPages: 1, statusCounts: { draft: 1 } }),
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<VibeList />);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('taxonomyTerm=mood%3Acalm'), expect.anything()));
    expect(screen.getByText('mood:calm')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Calm' })).toHaveAttribute('href', '/vibes?taxonomyTerm=mood%3Acalm');
    expect(screen.getByRole('link', { name: 'Editorial' })).toHaveAttribute('href', '/vibes?taxonomyTerm=visualFamily%3Aeditorial');
    fireEvent.click(screen.getByRole('button', { name: 'Clear taxonomy filter' }));
    expect(push).toHaveBeenCalledWith('/vibes');
  });
});
