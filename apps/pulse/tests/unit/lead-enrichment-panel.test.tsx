import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import LeadEnrichmentPanel from '@/components/admin/LeadEnrichmentPanel';
import type { InternalLead } from '@/lib/lead-generation/internalLeadSystem';

const lead: InternalLead = {
  id: '6f98b20f-1f3d-41d4-aee0-3cc4a8c6b264',
  created_at: '2026-08-03T12:00:00.000Z',
  updated_at: '2026-08-03T12:00:00.000Z',
  first_name: null,
  last_name: null,
  name: null,
  phone: null,
  email: null,
  property_address: '100 Main St',
  mailing_address: null,
  status: 'research',
  prospecting_source: 'absentee_owner',
  assigned_to: null,
  raw_paste_dump: null,
  metadata: {},
  notes: [],
  attachments: [],
  intelligenceEvidence: [{
    id: 'ef97b9ae-31e0-48e1-b320-f55359095388',
    created_at: '2026-08-03T12:00:00.000Z',
    source_url: 'https://records.example.com/property/100',
    source_host: 'records.example.com',
    source_type: 'tax_record',
    crawl_record_id: 'lead_crawl_test',
    crawl_status: 'completed',
    captured_at: '2026-08-03T12:00:00.000Z',
    title: 'Property 100',
    description: null,
    content_sha256: 'abc123',
    review_status: 'pending',
    accepted_fields: {},
    reviewed_at: null,
    reviewed_by_name: null,
    suggestions: [{
      field: 'mailing_address',
      currentValue: null,
      proposedValue: '400 Investor Ave',
      sourceLabel: 'Labeled mailing address',
    }],
  }],
};

describe('LeadEnrichmentPanel', () => {
  it('requires an operator to select proposed fields before applying evidence', () => {
    render(<LeadEnrichmentPanel lead={lead} onReload={vi.fn()} />);

    const applyButton = screen.getByRole('button', { name: /apply selected/i }) as HTMLButtonElement;
    expect(applyButton.disabled).toBe(true);

    fireEvent.click(screen.getByRole('checkbox'));
    expect(applyButton.disabled).toBe(false);
  });
});
