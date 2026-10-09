import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import reportIndex from '@/content/market-reports/index.v1.json';
import { listPublishedMarketReports } from '@/lib/marketing/marketReports.server';
import { marketReportCollectionSchema, marketReportSchema } from '@/lib/marketing/marketReportSchema';

const schemaOnlyReport = {
  schemaVersion: 1,
  reportId: 'schema-test-only',
  title: 'Schema test record, not market data',
  summary: 'This in-memory object exercises the parser and is never published or used as market evidence.',
  areaKey: 'keller-westlake',
  geographicScope: { type: 'city', label: 'Parser test scope', filters: [] },
  period: { from: '2026-01-01', through: '2026-01-31' },
  status: 'draft',
  revision: 1,
  reviewedAt: null,
  expiresAt: '2027-01-31',
  sampleCount: 1,
  source: {
    publisher: 'Test publisher',
    title: 'Synthetic parser input',
    sourceUrl: 'https://example.test/report',
    retrievedAt: '2026-02-01',
    effectiveDate: '2026-01-31',
    licenseStatus: 'unknown',
    permissionEvidence: 'Parser fixture only, not a real source or permission claim.',
  },
  metrics: [{
    key: 'synthetic-check',
    label: 'Parser-only metric',
    value: 0,
    unit: 'homes',
    method: 'count',
    definition: 'Synthetic contract test value, not a local market statistic.',
    sampleCount: 1,
  }],
};

describe('market report contract', () => {
  it('parses a strict contract-only draft record without treating it as public evidence', () => {
    expect(marketReportSchema.parse(schemaOnlyReport).status).toBe('draft');
  });

  it('rejects a published report without a review date and publication permission', () => {
    const result = marketReportSchema.safeParse({
      ...schemaOnlyReport,
      status: 'published',
      reviewedAt: '2026-02-02',
    });
    expect(result.success).toBe(false);
  });

  it('rejects reversed periods and unknown executable or unsupported fields', () => {
    expect(marketReportSchema.safeParse({ ...schemaOnlyReport, period: { from: '2026-02-01', through: '2026-01-01' } }).success).toBe(false);
    expect(marketReportSchema.safeParse({ ...schemaOnlyReport, execute: 'return 1' }).success).toBe(false);
  });

  it('keeps the public collection empty until authorized, reviewed market data exists', () => {
    expect(marketReportCollectionSchema.parse(reportIndex).reports).toEqual([]);
    expect(listPublishedMarketReports(new Date('2026-10-02T12:00:00-05:00'))).toEqual([]);
  });
});
