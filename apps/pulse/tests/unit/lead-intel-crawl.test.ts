import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  assertUrlAllowed,
  crawlLeadIntelligence,
  getLeadIntelCrawlSnapshot,
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
});

function setNodeEnv(value: NodeJS.ProcessEnv['NODE_ENV']) {
  (process.env as Record<string, string | undefined>).NODE_ENV = value;
}
