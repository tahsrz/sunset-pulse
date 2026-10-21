import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ScanReviewCard, type PropertyScanReviewSession } from '@/app/admin/property-scans/page';

describe('property scan review card', () => {
  it('shows a failed legacy reconstruction as unavailable property preview', () => {
    const session: PropertyScanReviewSession = {
      scanId: 'scan-1',
      propertyAddress: '808 W Abram St, Arlington, TX',
      listingId: null,
      listingLinkStatus: 'unresolved',
      captureMode: 'room_by_room',
      status: 'approved',
      revision: 3,
      manifestHash: 'manifest-hash',
      reviewNote: null,
      reviewedAt: null,
      reconstruction: {
        jobId: 'demo-1', status: 'failed', progress: 100, engine: 'manifest-preview-v1',
        previewKind: 'procedural-room-shell', roomCount: 0, assetCount: 1,
      },
      assets: [],
      consent: { ownerAuthorized: true, interiorCaptureAcknowledged: true, publicListingApproval: false },
      updatedAt: '2026-10-20T12:00:00.000Z',
    };

    render(<ScanReviewCard session={session} busy={false} onReview={vi.fn()} />);

    expect(screen.getByRole('status')).toHaveTextContent('A legacy demo reconstruction failed.');
    expect(screen.getByRole('status')).toHaveTextContent('It is not a model of this property');
    expect(screen.queryByText(/listing preview/i)).not.toBeInTheDocument();
  });
});
