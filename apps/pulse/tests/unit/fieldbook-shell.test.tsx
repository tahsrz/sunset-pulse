import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { FieldbookShell } from '@/components/realtor/FieldbookShell';
import RealtorWorkspace from '@/components/realtor/RealtorWorkspace';

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

it('displays the supplied workspace day without deriving a different day from the browser clock', () => {
  const { container } = render(<FieldbookShell title="Today" date="2026-10-13" timeZone="America/Los_Angeles"><p>Actions</p></FieldbookShell>);
  expect(container.querySelector('time')).toHaveAttribute('datetime', '2026-10-13');
  expect(container.querySelector('time')).toHaveTextContent('Tuesday, October 13, 2026 · America/Los_Angeles');
});

it('omits invalid calendar dates instead of normalizing them into a different date', () => {
  const view = render(<FieldbookShell title="Today" date="2026-02-30"><p>Actions</p></FieldbookShell>);
  expect(view.container.querySelector('time')).toBeNull();
  expect(screen.getByText('Actions')).toBeVisible();
});

it('retains read recovery when a stored timezone cannot be formatted', async () => {
  vi.stubGlobal('fetch', vi.fn(async (url: string) => Response.json(url === '/api/realtor/preferences'
    ? { ok: true, result: { time_zone: 'Invalid/Zone', reminders_enabled: false, gamification_enabled: false, celebrations_enabled: false } }
    : { ok: true, workspaces: [] })));
  render(<RealtorWorkspace section="today" />);
  expect(await screen.findByRole('alert')).toHaveTextContent('Invalid time zone');
  expect(screen.getByRole('button', { name: 'Retry seller activity' })).toBeVisible();
  expect(screen.getByRole('heading', { name: 'Today' })).toBeVisible();
});
