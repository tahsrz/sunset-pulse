import { describe, expect, it } from 'vitest';
import { buildLeadEvidenceSuggestions } from '@/lib/lead-intel/leadEvidence';
import type { LeadIntelCrawlRecord } from '@/lib/lead-intel/crawlLead';

const baseRecord: LeadIntelCrawlRecord = {
  id: 'lead_crawl_test',
  createdAt: '2026-08-03T12:00:00.000Z',
  framework: 'crawl4ai',
  status: 'completed',
  sourceType: 'tax_record',
  extractionMode: 'both',
  url: 'https://records.example.com/property/123',
  hostname: 'records.example.com',
  allowedBy: 'env_allowlist',
  entityHints: {},
  output: {
    json: {
      signals: {
        owner_names: ['Jane Example'],
        phones: ['817-555-0100'],
        emails: ['jane@example.com'],
        property_addresses: ['100 Main St'],
        mailing_addresses: ['400 Investor Ave'],
      },
    },
    wordCount: 25,
  },
  diagnostics: {
    workerPath: 'workers/lead-intel-crawler/crawl4ai_worker.py',
    pythonExecutable: 'python',
    durationMs: 12,
    ledgerPath: 'cartridges/lead-intel/crawl-results.jsonl',
  },
};

const emptyLead = {
  name: null,
  first_name: null,
  last_name: null,
  phone: null,
  email: null,
  property_address: null,
  mailing_address: null,
};

describe('lead evidence suggestions', () => {
  it('matches the correct structured row to the lead address', () => {
    const record: LeadIntelCrawlRecord = {
      ...baseRecord,
      output: {
        ...baseRecord.output,
        json: {
          results: [
            { property_owner: 'Wrong Owner', address: '10 Other Street' },
            { property_owner: 'Matched Owner', address: '100 Main St, Fort Worth, TX 76102' },
          ],
        },
      },
    };

    const suggestions = buildLeadEvidenceSuggestions(record, { ...emptyLead, property_address: '100 Main St' });
    expect(suggestions).toEqual(expect.arrayContaining([
      expect.objectContaining({ field: 'name', proposedValue: 'Matched Owner' }),
    ]));
    expect(suggestions.some((item) => item.proposedValue === 'Wrong Owner')).toBe(false);
  });

  it('does not guess from the first row when multiple structured records do not match', () => {
    const record: LeadIntelCrawlRecord = {
      ...baseRecord,
      output: {
        ...baseRecord.output,
        json: {
          data: [
            { owner_name: 'First Owner', property_address: '10 Other Street' },
            { owner_name: 'Second Owner', property_address: '20 Elsewhere Road' },
          ],
        },
      },
    };

    expect(buildLeadEvidenceSuggestions(record, { ...emptyLead, property_address: '100 Main St' })).toEqual([]);
  });

  it('accepts a scalar labeled signal', () => {
    const record: LeadIntelCrawlRecord = {
      ...baseRecord,
      output: { ...baseRecord.output, json: { signals: { owner_names: 'Scalar Owner' } } },
    };
    expect(buildLeadEvidenceSuggestions(record, emptyLead)).toEqual([
      expect.objectContaining({ field: 'name', proposedValue: 'Scalar Owner' }),
    ]);
  });

  it('prefers recognized structured extraction fields over regex signals', () => {
    const record: LeadIntelCrawlRecord = {
      ...baseRecord,
      output: {
        ...baseRecord.output,
        json: {
          extracted_records: [{
            owner_name: 'Structured Owner LLC',
            property_address: '200 Record Row',
            parcel_id: '123-456',
          }],
          signals: {
            owner_names: ['Fallback Owner'],
            property_addresses: ['100 Fallback St'],
          },
        },
      },
    };

    const suggestions = buildLeadEvidenceSuggestions(record, emptyLead);
    expect(suggestions).toEqual(expect.arrayContaining([
      expect.objectContaining({ field: 'name', proposedValue: 'Structured Owner LLC' }),
      expect.objectContaining({ field: 'property_address', proposedValue: '200 Record Row' }),
    ]));
    expect(suggestions.some((item) => item.proposedValue === 'Fallback Owner')).toBe(false);
  });

  it('maps labeled Crawl4AI signals into reviewable lead fields', () => {
    const suggestions = buildLeadEvidenceSuggestions(baseRecord, emptyLead);

    expect(suggestions).toEqual(expect.arrayContaining([
      expect.objectContaining({ field: 'name', proposedValue: 'Jane Example' }),
      expect.objectContaining({ field: 'phone', proposedValue: '817-555-0100' }),
      expect.objectContaining({ field: 'email', proposedValue: 'jane@example.com' }),
      expect.objectContaining({ field: 'property_address', proposedValue: '100 Main St' }),
      expect.objectContaining({ field: 'mailing_address', proposedValue: '400 Investor Ave' }),
    ]));
  });

  it('does not propose a value already present with different formatting', () => {
    const suggestions = buildLeadEvidenceSuggestions(baseRecord, {
      ...emptyLead,
      phone: '(817) 555-0100',
      email: 'JANE@example.com',
    });

    expect(suggestions.some((suggestion) => suggestion.field === 'phone')).toBe(false);
    expect(suggestions.some((suggestion) => suggestion.field === 'email')).toBe(false);
  });

  it('ignores unlabeled generic address candidates', () => {
    const record = {
      ...baseRecord,
      output: {
        json: { signals: { addresses: ['500 Footer Road'] } },
        wordCount: 10,
      },
    } satisfies LeadIntelCrawlRecord;

    expect(buildLeadEvidenceSuggestions(record, emptyLead)).toEqual([]);
  });
});
