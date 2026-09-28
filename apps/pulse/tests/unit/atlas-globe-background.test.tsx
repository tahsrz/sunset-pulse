import React from 'react';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import AtlasGlobeBackground from '@/components/atlas/AtlasGlobeBackground';
vi.mock('@/components/atlas/AtlasGlobeCanvas', () => ({ default: () => <div data-testid="globe" /> }));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
it.each([{ ok: false, data: { error: 'Unavailable' } }, { ok: true, data: { error: 'Invalid shape' } }])('does not render an error payload as globe data: $ok', async ({ ok, data }) => {
  const fetchMock = vi.fn(async () => ({ ok, json: async () => data }));
  vi.stubGlobal('fetch', fetchMock);
  render(<AtlasGlobeBackground />);
  await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
  expect(screen.queryByTestId('globe')).not.toBeInTheDocument();
});
it('renders valid empty Atlas data', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ nodes: [], domains: [], progress: {} }) })));
  render(<AtlasGlobeBackground />);
  expect(await screen.findByTestId('globe')).toBeInTheDocument();
});
