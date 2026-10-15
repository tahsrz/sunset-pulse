import React from 'react';
import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { PlannerTaskLinks } from '@/components/realtor/PlannerTaskLinks';

const lead = { id: '33333333-3333-4333-8333-333333333333' };

it('retains a past-year due date and the current-owner seller link', () => {
  render(<PlannerTaskLinks dueDate="2025-12-31" sellerSourceAvailable={true} sellerLead={lead} />);
  expect(screen.getByRole('link', { name: 'Open planner task' })).toHaveAttribute('href', '/planner?date=2025-12-31');
  expect(screen.getByRole('link', { name: 'Open seller request' })).toHaveAttribute('href', `/seller-inbox?leadId=${lead.id}`);
});
it.each([false, undefined, 'true'])(
  'does not infer seller ownership from a stored lead identifier when availability is %s', (available) => {
    render(<PlannerTaskLinks dueDate="2026-10-09" sellerSourceAvailable={available} sellerLead={lead} />);
    expect(screen.queryByRole('link', { name: 'Open seller request' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open planner task' })).toBeInTheDocument();
  },
);
it('removes the seller link after an owner refresh while retaining the planner handoff', () => {
  const view = render(<PlannerTaskLinks dueDate="2026-10-09" sellerSourceAvailable={true} sellerLead={lead} />);
  view.rerender(<PlannerTaskLinks dueDate="2026-10-09" sellerSourceAvailable={false} sellerLead={null} />);
  expect(screen.queryByRole('link', { name: 'Open seller request' })).not.toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Open planner task' })).toHaveAttribute('href', '/planner?date=2026-10-09');
});
it('keeps malformed dates and seller identifiers out of navigation URLs', () => {
  render(<PlannerTaskLinks dueDate="2026-02-30" sellerSourceAvailable={true} sellerLead={{ id: 'javascript:alert(1)' }} />);
  expect(screen.getByRole('link', { name: 'Open planner task' })).toHaveAttribute('href', '/planner');
  expect(screen.queryByRole('link', { name: 'Open seller request' })).not.toBeInTheDocument();
});
