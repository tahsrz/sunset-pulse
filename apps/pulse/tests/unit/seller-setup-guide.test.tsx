import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { SellerOverviewPanel } from '@/components/realtor/SellerOverviewPanel';
import { SellerSetupGuide } from '@/components/realtor/SellerSetupGuide';
import { deriveSellerSetupSteps, type SellerSetupHealth } from '@/lib/realtor-workspace/sellerSetupGuide';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

const health: SellerSetupHealth = {
  plannerConfigured: true, timeZone: 'America/Chicago', remindersEnabled: true, activeSites: 1,
  emailContractEnabled: false, pendingJobs: 0, failedJobs: 0, lastCompletedJob: null,
  lastRequest: '2026-10-19T15:00:00.000Z', unresolvedEmails: 0, emailConfigured: false,
  webhookConfigured: false, intakeConfigured: true,
};

function response(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json' } });
}

function overview(healthValue: SellerSetupHealth) {
  return { ok: true, result: { health: healthValue, funnel: { startAt: '2026-10-01T00:00:00Z', timeZone: 'America/Chicago', generatedAt: '2026-10-19T15:00:00Z', visits: 0, offerClicks: 0, requests: 0, replies: 0, held: 0, signed: 0, closed: 0, campaigns: [], hasMoreCampaigns: false } } };
}

describe('seller setup guide', () => {
  it('derives ready and incomplete steps from saved health, including unavailable dependencies', () => {
    expect(deriveSellerSetupSteps(health).map((step) => step.status)).toEqual(['ready', 'ready', 'ready', 'ready']);
    const partial = deriveSellerSetupSteps({ ...health, plannerConfigured: false, timeZone: null, remindersEnabled: false, activeSites: 0, intakeConfigured: false, lastRequest: null });
    expect(partial.map((step) => step.status)).toEqual(['needs_action', 'unavailable', 'unavailable', 'needs_action']);
  });

  it('shows four saved-state steps and keeps operator diagnostics collapsed', () => {
    const { container } = render(<SellerSetupGuide health={health} onRefresh={vi.fn()} />);
    expect(screen.getByRole('heading', { name: '1. Your day and timezone' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '2. Your seller website' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '3. Your reminders' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '4. Your first seller request' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Manage your seller website' })).toHaveAttribute('href', '/dashboard');
    expect(screen.getByRole('link', { name: 'Manage your seller website' })).toHaveClass('min-h-11');
    expect(screen.getByText(/verified mailbox and record those conversations here/)).toBeInTheDocument();
    expect(container.querySelector('details')?.open).toBe(false);
  });

  it('shows a read failure as an error, then recovers to a real empty setup state on refresh', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response({ ok: false, error: 'private database details' }, 503))
      .mockResolvedValueOnce(response(overview({ ...health, plannerConfigured: false, timeZone: null, remindersEnabled: false, activeSites: 0, intakeConfigured: false, lastRequest: null })));
    vi.stubGlobal('fetch', fetchMock);
    render(<SellerOverviewPanel mode="setup" />);

    expect(await screen.findByRole('alert')).toHaveTextContent('We could not read your saved seller status.');
    expect(screen.queryByRole('link', { name: 'Sign in' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: '1. Your day and timezone' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Refresh seller status' }));
    await waitFor(() => expect(screen.getByRole('heading', { name: '1. Your day and timezone' })).toBeInTheDocument());
    expect(screen.getAllByText('Unavailable').length).toBeGreaterThan(0);
    expect(screen.getByRole('link', { name: 'Open seller request form' })).toHaveAttribute('href', '/seller-plan');
  });
});
