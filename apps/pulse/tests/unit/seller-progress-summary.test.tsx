import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SellerProgressSummary } from '@/components/realtor/SellerProgressSummary';

describe('seller progress summary', () => {
  it('shows the five independently recorded checkpoints from the same request cohort', () => {
    render(<SellerProgressSummary funnel={{
      startAt: '2026-10-01T05:00:00.000Z', timeZone: 'America/Chicago', generatedAt: '2026-10-20T15:00:00.000Z',
      visits: 100, offerClicks: 20, requests: 8, replies: 5, held: 3, signed: 4, closed: 1,
      campaigns: [], hasMoreCampaigns: false,
    }}/>);

    expect(screen.getByRole('heading', { name: 'Seller progress' })).toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'Recorded seller journey checkpoints' })).toBeInTheDocument();
    expect(screen.getByText('Requests', { selector: 'h3' })).toBeInTheDocument();
    expect(screen.getByText('Conversations', { selector: 'h3' })).toBeInTheDocument();
    expect(screen.getByText('Consultations held', { selector: 'h3' })).toBeInTheDocument();
    expect(screen.getByText('Agreements verified', { selector: 'h3' })).toBeInTheDocument();
    expect(screen.getByText('Closings recorded', { selector: 'h3' })).toBeInTheDocument();
    expect(screen.getByText('Each number is a separately recorded checkpoint for requests created in this period. The counts are not a drop-off chart, and a later checkpoint can exist without an earlier one being recorded.')).toBeInTheDocument();
    expect(screen.queryByText('100')).not.toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
  });
});
