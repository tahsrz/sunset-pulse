import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CommandRouteDirectory } from '@/components/command-center/CommandRouteDirectory';

vi.mock('next/link', () => ({ default: ({ prefetch, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { prefetch?: boolean }) => <a data-prefetch={String(prefetch)} {...props} /> }));

describe('command route directory', () => {
  function openDirectory() {
    const view = render(<CommandRouteDirectory />);
    view.container.querySelector('details')!.open = true;
    return view;
  }
  it('finds a previously unlisted route and does not prefetch the route inventory', () => {
    openDirectory();
    fireEvent.change(screen.getByRole('searchbox', { name: 'Search app paths' }), { target: { value: 'taxonomy' } });
    const link = screen.getByRole('link', { name: 'Open route: Vibe taxonomy' });
    expect(link).toHaveAttribute('href', '/vibes/taxonomy');
    expect(link).toHaveAttribute('data-prefetch', 'false');
    expect(screen.getByRole('status')).toHaveTextContent('1 matching routes');
  });
  it('shows context requirements without linking placeholder tokens', () => {
    openDirectory();
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: '/sign/' } });
    expect(screen.getByText('/sign/[token]')).toBeInTheDocument();
    expect(screen.getByText('Requires an existing workflow link')).toBeInTheDocument();
    expect(screen.queryByRole('link')).toBeNull();
  });
  it('combines section filtering and search with a clear empty state', () => {
    openDirectory();
    fireEvent.change(screen.getByRole('combobox', { name: 'Route section' }), { target: { value: 'Games' } });
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'chess' } });
    expect(screen.getByRole('link', { name: 'Open route: Chess with Jamie' })).toHaveAttribute('href', '/play-jamie/chess');
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'taxonomy' } });
    expect(screen.getByText('No matching paths. Try a different feature or URL.')).toBeInTheDocument();
  });
});
