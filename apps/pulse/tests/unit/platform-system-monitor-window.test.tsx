import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { SystemMonitorWindow } from '@/components/platform/SystemMonitorWindow';

const workspaceId = '11111111-1111-4111-8111-111111111111';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('canvas system monitor read surfaces', () => {
  it('uses capped connector health/history inputs and renders the existing summary', async () => {
    const fetchMock = vi.fn(async () => Response.json({ ok: true, result: {
      healthSummary: { healthy: 2, unavailable: 1, schema_drift: 0, stale: 0 },
      health: [{ id: 'connector-1', title: 'Listings', status: 'healthy', scheduler_status: 'active', checked_at: '2026-09-24T12:00:00Z' }],
    } }));
    vi.stubGlobal('fetch', fetchMock);

    render(<SystemMonitorWindow workspaceId={workspaceId} panel="connectors" />);

    expect(await screen.findByText('Listings')).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/workspaces/${workspaceId}/checkpoints?limit=1&healthLimit=12&healthHistoryLimit=1&healthAuditLimit=1&providerExceptionLimit=1&unknownEffectLimit=1`,
      { cache: 'no-store' },
    );
    expect(screen.getByText('2')).toBeTruthy();
  });

  it('labels the scheduler panel as a bounded run summary and never requests queue controls', async () => {
    const fetchMock = vi.fn(async () => Response.json({ ok: true, result: {
      items: [{ id: 'run-1', status: 'waiting', definition: { key: 'readiness', version: 1 } }], nextCursor: 'next',
    } }));
    vi.stubGlobal('fetch', fetchMock);

    render(<SystemMonitorWindow workspaceId={workspaceId} panel="scheduler" />);

    expect(await screen.findByText('readiness')).toBeTruthy();
    expect(screen.getByText(/does not inspect or control scheduler queue jobs/)).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledWith(`/api/workspaces/${workspaceId}/runs?limit=25`, { cache: 'no-store' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('shows quota and provider limits without activating providers', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => String(input).endsWith('/providers')
      ? Response.json({ ok: true, result: [{ provider_key: 'model', adapter_key: 'draft', max_concurrent_operations: 1, max_reserved_cost_usd: 4, max_daily_cost_usd: 20, revision: 2 }] })
      : Response.json({ ok: true, result: { max_concurrent_operations: 3, max_steps_per_run: 10, max_estimated_cost_usd: 5, max_tokens_per_run: 1000, max_run_estimated_cost_usd: 2, max_run_duration_seconds: 900, revision: 1 } }));
    vi.stubGlobal('fetch', fetchMock);

    render(<SystemMonitorWindow workspaceId={workspaceId} panel="quotas" />);

    expect(await screen.findByText('model/draft · concurrency 1 · reserved $4 · daily $20')).toBeTruthy();
    expect(screen.getByText(/does not activate providers or make paid calls/)).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('explains owner/admin restrictions returned by existing APIs', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({ ok: false, error: 'Forbidden' }, { status: 403 })));

    render(<SystemMonitorWindow workspaceId={workspaceId} panel="quotas" />);

    expect((await screen.findByRole('alert')).textContent).toContain('limited to owners and admins');
  });
});
