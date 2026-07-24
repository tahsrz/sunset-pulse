import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  fetch: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: mocks.refresh }) }));

import AgentLeadActions from '@/app/admin/agent-leads/AgentLeadActions';

describe('Jamie public guide disposition UI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('React', React);
    vi.stubGlobal('fetch', mocks.fetch);
    mocks.fetch.mockResolvedValue(new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }));
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('submits only a fixed selected lead outcome', async () => {
    render(
      <AgentLeadActions
        lead={{
          id: '11111111-1111-4111-8111-111111111111',
          agent_id: 'broker-one',
          site: 'broker-one',
          name: 'Jamie Lead',
          email: 'lead@example.test',
          phone: '',
          message: '',
          source: 'jamie_public_guide',
          status: 'new',
          internal_note: '',
          metadata: {},
          created_at: '2026-07-24T12:00:00.000Z',
        }}
        publicGuideDisposition="unassigned"
      />,
    );

    fireEvent.change(screen.getByLabelText('Jamie Lead Outcome'), { target: { value: 'qualified' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Outcome' }));

    await waitFor(() => expect(mocks.fetch).toHaveBeenCalledTimes(1));
    const [, options] = mocks.fetch.mock.calls[0];
    expect(JSON.parse(String(options?.body))).toEqual({
      id: '11111111-1111-4111-8111-111111111111',
      action: 'disposition',
      disposition: 'qualified',
    });
    expect(mocks.refresh).toHaveBeenCalled();
  });
});
