import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GlobalCommandPalette } from '@/components/GlobalCommandPalette';
import { appRoutes, routeDescription } from '@/lib/navigation/routeCatalog';

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
const routes = appRoutes.map((route) => ({ ...route, description: routeDescription(route) }));

describe('global command route navigation', () => {
  const originalScroll = HTMLElement.prototype.scrollIntoView;
  beforeEach(() => {
    push.mockClear();
    vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
    HTMLElement.prototype.scrollIntoView = vi.fn();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    HTMLElement.prototype.scrollIntoView = originalScroll;
  });
  it('searches a concrete URL and opens it without an AI request', async () => {
    const close = vi.fn();
    render(<GlobalCommandPalette open onOpenChange={close} routes={routes} isLoggedIn loginHref="/login" />);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: '/vibes/taxonomy' } });
    const item = await screen.findByRole('option', { name: /Vibe taxonomy/ });
    fireEvent.click(item);
    expect(push).toHaveBeenCalledWith('/vibes/taxonomy');
    expect(close).toHaveBeenCalledWith(false);
  });
  it('keeps token-only workflows non-navigable and routes Vibe templates to the directory', async () => {
    render(<GlobalCommandPalette open onOpenChange={vi.fn()} routes={routes} isLoggedIn loginHref="/login" />);
    const search = screen.getByRole('combobox');
    fireEvent.change(search, { target: { value: '/sign/' } });
    await waitFor(() => expect(screen.getByRole('option', { name: /Sign agreement/ })).toHaveAttribute('aria-disabled', 'true'));
    fireEvent.click(screen.getByRole('option', { name: /Sign agreement/ }));
    expect(push).not.toHaveBeenCalled();
    fireEvent.change(search, { target: { value: 'Vibe revisions' } });
    fireEvent.click(await screen.findByRole('option', { name: /Vibe revisions/ }));
    expect(push).toHaveBeenCalledWith('/vibes');
  });
});
