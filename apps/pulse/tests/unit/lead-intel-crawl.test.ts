import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  assertUrlAllowed,
  crawlLeadIntelligence,
  getLeadIntelCrawlSnapshot,
  importLeadIntelCrawlToTah,
  normalizeCrawlInput,
  requestAllowlistIsTrusted,
} from '@/lib/lead-intel/crawlLead';

const originalEnv = { ...process.env };
let tempDir: string;

beforeEach(() => {
  process.env = { ...originalEnv };
  setNodeEnv('development');
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lead-intel-'));
  process.env.LEAD_INTEL_LEDGER_PATH = path.join(tempDir, 'crawl-results.jsonl');
});

afterEach(() => {
  process.env = { ...originalEnv };
  fs.rmSync(tempDir, { recursive: true, force: true });
});

describe('lead intelligence Crawl4AI safety', () => {
  it('blocks private and local hosts before worker execution', () => {
    expect(() => assertUrlAllowed('http://127.0.0.1:3000/admin')).toThrow(/Private/);
    expect(() => assertUrlAllowed('http://localhost:3000/admin')).toThrow(/Private/);
    expect(() => assertUrlAllowed('http://192.168.1.12/status')).toThrow(/Private/);
  });

  it('allows env-listed domains and subdomains', () => {
    process.env.LEAD_INTEL_ALLOWED_DOMAINS = 'dallascad.org,example.com';

    expect(assertUrlAllowed('https://records.dallascad.org/property/1')).toMatchObject({
      hostname: 'records.dallascad.org',
      allowedBy: 'env_allowlist',
    });
  });

  it('drops request allowlists in production unless explicitly trusted', () => {
    setNodeEnv('production');

    expect(requestAllowlistIsTrusted()).toBe(false);
    expect(normalizeCrawlInput({
      url: 'https://example.com',
      allowedDomains: ['example.com'],
    }).allowedDomains).toEqual([]);

    process.env.LEAD_INTEL_TRUST_REQUEST_ALLOWLIST = 'true';
    expect(requestAllowlistIsTrusted()).toBe(true);
    expect(normalizeCrawlInput({
      url: 'https://example.com',
      allowedDomains: ['example.com'],
    }).allowedDomains).toEqual(['example.com']);
  });
});

describe('lead intelligence Crawl4AI ledger', () => {
  it('records disabled crawler attempts without running Python', async () => {
    process.env.LEAD_INTEL_CRAWLER_DISABLED = 'true';

    const record = await crawlLeadIntelligence({
      url: 'https://example.com/property/1',
      sourceType: 'regional_site',
      entityHints: { market: 'Dallas', score: 7, skip: undefined },
      allowedDomains: ['example.com'],
    });

    expect(record.status).toBe('blocked');
    expect(record.framework).toBe('crawl4ai');
    expect(record.entityHints).toEqual({ market: 'Dallas', score: 7 });

    const snapshot = getLeadIntelCrawlSnapshot();
    expect(snapshot).toMatchObject({
      status: 'disabled',
      crawlCount: 1,
      sourceCounts: { regional_site: 1 },
      hostCounts: { 'example.com': 1 },
    });
    expect(snapshot.recent[0]?.diagnostics.note).toBe('LEAD_INTEL_CRAWLER_DISABLED=true');
  });

  it('imports completed Crawl4AI Markdown into a source file and binary TAH cartridge', () => {
    const record = {
      id: 'lead_crawl_test',
      createdAt: '2026-06-25T15:00:00.000Z',
      framework: 'crawl4ai',
      status: 'completed',
      sourceType: 'tax_record',
      extractionMode: 'both',
      url: 'https://records.example.com/property/123',
      hostname: 'records.example.com',
      allowedBy: 'env_allowlist',
      entityHints: { market: 'Dallas', parcel: '123' },
      output: {
        markdown: '# Property Record\n\nOwner: Example Holdings\n\nValue: $450,000',
        json: { signals: { money_values: ['$450,000'] } },
        title: 'Property Record 123',
        description: 'A public record page.',
        links: [],
        sourceUrl: 'https://records.example.com/property/123',
        wordCount: 7,
      },
      diagnostics: {
        workerPath: 'workers/lead-intel-crawler/crawl4ai_worker.py',
        pythonExecutable: 'python',
        durationMs: 12,
        ledgerPath: 'crawl-results.jsonl',
      },
    };
    fs.writeFileSync(process.env.LEAD_INTEL_LEDGER_PATH!, `${JSON.stringify(record)}\n`, 'utf8');

    const result = importLeadIntelCrawlToTah({
      recordId: 'lead_crawl_test',
      outputDir: path.join(tempDir, 'imports'),
    });

    expect(result).toMatchObject({
      status: 'imported',
      recordId: 'lead_crawl_test',
      concept: expect.stringContaining('records_example_com'),
      binaryByteSize: expect.any(Number),
      binaryShardCount: expect.any(Number),
    });
    expect(result.sourceOutputPath).toMatch(/\.source\.md$/);
    expect(result.outputPath).toMatch(/\.tah$/);

    const source = fs.readFileSync(path.join(process.cwd(), result.sourceOutputPath!), 'utf8');
    expect(source).toContain('SOURCE_TYPE: crawl4ai_import');
    expect(source).toContain('DOMAIN: lead_intelligence');
    expect(source).toContain('Owner: Example Holdings');
    expect(source).toContain('"money_values"');

    const binary = fs.readFileSync(path.join(process.cwd(), result.outputPath!));
    expect(binary.readUInt32LE(0)).toBe(0x54414821);
    expect(binary.readUInt32LE(16)).toBeGreaterThan(0);
  });
});

function setNodeEnv(value: NodeJS.ProcessEnv['NODE_ENV']) {
  (process.env as Record<string, string | undefined>).NODE_ENV = value;
}
