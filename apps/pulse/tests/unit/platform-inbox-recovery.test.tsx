import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PlatformInbox } from '@/components/platform/PlatformInbox';

vi.mock('next/link', () => ({ default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a> }));
vi.mock('@/components/platform/QuotaBudgetPanel', () => ({ QuotaBudgetPanel: () => null }));

describe('shared checkpoint inbox recovery', () => {
  it('reloads workspace data after an initial failure', async () => {
    let checkpointReads = 0;
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith('/checkpoints') && checkpointReads++ === 0) {
        return { ok: false, json: async () => ({ error: 'Workspace data is unavailable.' }) } as Response;
      }
      if (url.endsWith('/checkpoints')) return { ok: true, json: async () => ({ result: {
        items: [], health: [], healthSummary: { healthy: 0, unavailable: 0, schema_drift: 0, stale: 0 },
        healthHistory: [], providerExceptions: [], canManageProviderRecovery: false,
        canRespondQuestion: false, canResolveApproval: false, canResolveEffectGate: false,
      } }) } as Response;
      if (url.endsWith('/apps')) return { ok: true, json: async () => ({ result: [] }) } as Response;
      return { ok: true, json: async () => ({ result: { items: [] } }) } as Response;
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<PlatformInbox workspaceId="workspace-1" />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Workspace data is unavailable.');
    fireEvent.click(screen.getByRole('button', { name: 'Reload workspace data' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(6));
    expect(await screen.findByText('Nothing needs your input.')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
