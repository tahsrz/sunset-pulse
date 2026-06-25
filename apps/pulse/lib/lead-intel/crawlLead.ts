import fs from 'fs';
import path from 'path';
import crypto from 'node:crypto';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { TAHBuilder } from '@/lib/core/tah_builder';
import { createTahInputsFromText } from '@/lib/core/tah_ingest';

const execFileAsync = promisify(execFile);

export type LeadIntelSourceType =
  | 'brokerage'
  | 'regional_site'
  | 'tax_record'
  | 'business_profile'
  | 'other';

export type LeadIntelExtractionMode = 'markdown' | 'json' | 'both';

export type LeadIntelCrawlInput = {
  url: string;
  sourceType?: LeadIntelSourceType;
  entityHints?: Record<string, string | number | boolean | null | undefined>;
  extractionMode?: LeadIntelExtractionMode;
  maxPages?: number;
  timeoutMs?: number;
  allowedDomains?: string[];
};

export type LeadIntelCrawlRecord = {
  id: string;
  createdAt: string;
  framework: 'crawl4ai';
  status: 'completed' | 'unavailable' | 'blocked' | 'failed';
  sourceType: LeadIntelSourceType;
  extractionMode: LeadIntelExtractionMode;
  url: string;
  hostname: string;
  allowedBy: 'env_allowlist' | 'request_allowlist' | 'unlisted_local_override';
  entityHints: Record<string, string | number | boolean | null>;
  output: {
    markdown?: string;
    json?: unknown;
    title?: string | null;
    description?: string | null;
    links?: Array<{ href: string; text?: string | null }>;
    sourceUrl?: string | null;
    wordCount: number;
  };
  diagnostics: {
    workerPath: string;
    pythonExecutable: string;
    durationMs: number;
    ledgerPath: string;
    note?: string;
  };
};

export type LeadIntelCrawlSnapshot = {
  status: 'empty' | 'ready' | 'disabled';
  path: string;
  crawlCount: number;
  sourceCounts: Record<string, number>;
  hostCounts: Record<string, number>;
  lastCrawledAt: string | null;
  recent: LeadIntelCrawlRecord[];
};

export type LeadIntelTahImportResult = {
  status: 'imported' | 'skipped';
  outputPath: string | null;
  sourceOutputPath: string | null;
  binaryOutputPath: string | null;
  recordId: string | null;
  concept: string | null;
  title: string | null;
  markdownChars: number;
  writtenChars: number;
  binaryByteSize: number;
  binaryShardCount: number;
  reason?: string;
};

type WorkerPayload = {
  status?: string;
  markdown?: string;
  json?: unknown;
  title?: string | null;
  description?: string | null;
  links?: Array<{ href: string; text?: string | null }>;
  sourceUrl?: string | null;
  note?: string;
};

const DEFAULT_LEDGER_FILE = 'crawl-results.jsonl';
const DEFAULT_TAH_IMPORT_DIR = path.join('cartridges', 'imports', 'lead-intel');
const DEFAULT_MAX_PAGES = 1;
const DEFAULT_TIMEOUT_MS = 45_000;
const MAX_RECENT_CRAWLS = 50;
const PRIVATE_HOST_PATTERNS = [
  /^localhost$/i,
  /^127\./,
  /^10\./,
  /^192\.168\./,
  /^169\.254\./,
  /^172\.(1[6-9]|2\d|3[0-1])\./,
  /^0\./,
  /^\[?::1\]?$/i
];

export async function crawlLeadIntelligence(input: LeadIntelCrawlInput): Promise<LeadIntelCrawlRecord> {
  const startedAt = Date.now();
  const normalized = normalizeCrawlInput(input);
  const safety = assertUrlAllowed(normalized.url, normalized.allowedDomains);
  const workerPath = leadIntelWorkerPath();
  const pythonExecutable = process.env.LEAD_INTEL_PYTHON || 'python';

  if (process.env.LEAD_INTEL_CRAWLER_DISABLED === 'true') {
    const record = buildRecord({
      input: normalized,
      status: 'blocked',
      safety,
      workerPath,
      pythonExecutable,
      startedAt,
      payload: { note: 'LEAD_INTEL_CRAWLER_DISABLED=true' }
    });
    saveLeadIntelCrawlRecord(record);
    return record;
  }

  try {
    const { stdout } = await execFileAsync(
      pythonExecutable,
      [
        workerPath,
        '--url', normalized.url,
        '--mode', normalized.extractionMode,
        '--max-pages', String(normalized.maxPages),
        '--hints', JSON.stringify(normalized.entityHints)
      ],
      {
        cwd: process.cwd(),
        timeout: normalized.timeoutMs,
        maxBuffer: 1024 * 1024 * 8,
        env: {
          ...process.env,
          PYTHONIOENCODING: 'utf-8'
        }
      }
    );
    const payload = parseWorkerPayload(stdout);
    const record = buildRecord({
      input: normalized,
      status: workerStatusFor(payload.status),
      safety,
      workerPath,
      pythonExecutable,
      startedAt,
      payload
    });
    saveLeadIntelCrawlRecord(record);
    return record;
  } catch (error) {
    const record = buildRecord({
      input: normalized,
      status: isUnavailableError(error) ? 'unavailable' : 'failed',
      safety,
      workerPath,
      pythonExecutable,
      startedAt,
      payload: { note: error instanceof Error ? error.message : 'Crawl4AI worker failed' }
    });
    saveLeadIntelCrawlRecord(record);
    return record;
  }
}

export function getLeadIntelCrawlSnapshot(): LeadIntelCrawlSnapshot {
  const filePath = leadIntelLedgerPath();
  const relativePath = path.relative(process.cwd(), filePath);

  if (!fs.existsSync(filePath)) {
    return {
      status: process.env.LEAD_INTEL_CRAWLER_DISABLED === 'true' ? 'disabled' : 'empty',
      path: relativePath,
      crawlCount: 0,
      sourceCounts: {},
      hostCounts: {},
      lastCrawledAt: null,
      recent: []
    };
  }

  const records = readLeadIntelRecords(filePath);
  return {
    status: process.env.LEAD_INTEL_CRAWLER_DISABLED === 'true' ? 'disabled' : 'ready',
    path: relativePath,
    crawlCount: records.length,
    sourceCounts: countBy(records, (record) => record.sourceType),
    hostCounts: countBy(records, (record) => record.hostname),
    lastCrawledAt: records.at(-1)?.createdAt || null,
    recent: records.slice(-MAX_RECENT_CRAWLS)
  };
}

export function importLeadIntelCrawlToTah(input: {
  recordId?: string;
  outputDir?: string;
  outputPath?: string;
  sourceOutputPath?: string;
  binaryOutputPath?: string;
  forgeBinary?: boolean;
  maxChars?: number;
} = {}): LeadIntelTahImportResult {
  const filePath = leadIntelLedgerPath();
  if (!fs.existsSync(filePath)) {
    return skippedImport('No Crawl4AI ledger exists yet.');
  }

  const records = readLeadIntelRecords(filePath);
  const record = input.recordId
    ? records.find((item) => item.id === input.recordId)
    : [...records].reverse().find((item) => item.status === 'completed' && Boolean(item.output.markdown));

  if (!record) {
    return skippedImport(input.recordId ? `No crawl record found for ${input.recordId}.` : 'No completed crawl record with Markdown was found.');
  }

  if (record.status !== 'completed') {
    return skippedImport(`Crawl record ${record.id} is ${record.status}, not completed.`, record.id);
  }

  const markdown = compactMarkdown(record.output.markdown || '', input.maxChars || 160_000);
  if (!markdown) {
    return skippedImport(`Crawl record ${record.id} has no Markdown output.`, record.id);
  }

  const title = record.output.title || titleFromUrl(record.url);
  const concept = slugify(`lead intel ${record.hostname} ${title}`);
  const outputDir = path.resolve(input.outputDir || path.join(process.cwd(), DEFAULT_TAH_IMPORT_DIR));
  const sourceOutputPath = path.resolve(input.sourceOutputPath || path.join(outputDir, `${concept}.source.md`));
  const shouldForgeBinary = input.forgeBinary !== false;
  const binaryOutputPath = path.resolve(input.binaryOutputPath || input.outputPath || path.join(outputDir, `${concept}.tah`));
  const cartridge = formatLeadIntelTah({
    record,
    title,
    concept,
    markdown,
    wasTrimmed: markdown.length < (record.output.markdown || '').length,
  });

  fs.mkdirSync(path.dirname(sourceOutputPath), { recursive: true });
  fs.writeFileSync(sourceOutputPath, cartridge, 'utf8');
  const binaryStats = shouldForgeBinary
    ? forgeLeadIntelBinaryTah({
        cartridge,
        outputPath: binaryOutputPath,
        keywords: [concept, record.hostname, record.sourceType, ...Object.values(record.entityHints).map(String)],
      })
    : { byteSize: 0, shardCount: 0 };

  return {
    status: 'imported',
    outputPath: shouldForgeBinary ? path.relative(process.cwd(), binaryOutputPath) : null,
    sourceOutputPath: path.relative(process.cwd(), sourceOutputPath),
    binaryOutputPath: shouldForgeBinary ? path.relative(process.cwd(), binaryOutputPath) : null,
    recordId: record.id,
    concept,
    title,
    markdownChars: markdown.length,
    writtenChars: cartridge.length,
    binaryByteSize: binaryStats.byteSize,
    binaryShardCount: binaryStats.shardCount,
  };
}

export function leadIntelLedgerPath() {
  return path.resolve(
    process.env.LEAD_INTEL_LEDGER_PATH ||
      path.join(process.cwd(), 'cartridges', 'lead-intel', DEFAULT_LEDGER_FILE)
  );
}

export function leadIntelWorkerPath() {
  return path.resolve(
    process.env.LEAD_INTEL_WORKER_PATH ||
      path.join(process.cwd(), 'workers', 'lead-intel-crawler', 'crawl4ai_worker.py')
  );
}

export function normalizeCrawlInput(input: LeadIntelCrawlInput): Required<LeadIntelCrawlInput> {
  return {
    url: String(input.url || '').trim(),
    sourceType: input.sourceType || 'other',
    entityHints: sanitizeHints(input.entityHints || {}),
    extractionMode: input.extractionMode || 'both',
    maxPages: clampInteger(input.maxPages || DEFAULT_MAX_PAGES, 1, 10),
    timeoutMs: clampInteger(input.timeoutMs || DEFAULT_TIMEOUT_MS, 5_000, 120_000),
    allowedDomains: trustedRequestAllowlist(input.allowedDomains || [])
  };
}

export function assertUrlAllowed(urlValue: string, requestAllowedDomains: string[] = []) {
  let parsed: URL;
  try {
    parsed = new URL(urlValue);
  } catch {
    throw new Error('A valid URL is required.');
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('Only http and https URLs can be crawled.');
  }

  if (parsed.username || parsed.password) {
    throw new Error('Crawler URLs cannot include credentials.');
  }

  const hostname = normalizeDomain(parsed.hostname);
  if (!hostname || isPrivateHostname(hostname)) {
    throw new Error('Private, local, and link-local hosts are blocked.');
  }

  const envAllowedDomains = allowedDomainsFromEnv();
  if (domainIsAllowed(hostname, envAllowedDomains)) {
    return { hostname, allowedBy: 'env_allowlist' as const };
  }

  if (domainIsAllowed(hostname, requestAllowedDomains)) {
    return { hostname, allowedBy: 'request_allowlist' as const };
  }

  if (process.env.LEAD_INTEL_ALLOW_UNLISTED === 'true' && process.env.NODE_ENV !== 'production') {
    return { hostname, allowedBy: 'unlisted_local_override' as const };
  }

  throw new Error(`Domain "${hostname}" is not in the lead-intel crawl allowlist.`);
}

function buildRecord(input: {
  input: Required<LeadIntelCrawlInput>;
  status: LeadIntelCrawlRecord['status'];
  safety: ReturnType<typeof assertUrlAllowed>;
  workerPath: string;
  pythonExecutable: string;
  startedAt: number;
  payload: WorkerPayload;
}): LeadIntelCrawlRecord {
  const markdown = compactMarkdown(input.payload.markdown || '', 30_000);
  return {
    id: `lead_crawl_${hashId(`${input.input.url}:${Date.now()}`)}`,
    createdAt: new Date().toISOString(),
    framework: 'crawl4ai',
    status: input.status,
    sourceType: input.input.sourceType,
    extractionMode: input.input.extractionMode,
    url: input.input.url,
    hostname: input.safety.hostname,
    allowedBy: input.safety.allowedBy,
    entityHints: sanitizeHints(input.input.entityHints),
    output: {
      markdown: markdown || undefined,
      json: input.payload.json,
      title: input.payload.title || null,
      description: input.payload.description || null,
      links: sanitizeLinks(input.payload.links || []),
      sourceUrl: input.payload.sourceUrl || input.input.url,
      wordCount: markdown ? markdown.split(/\s+/g).filter(Boolean).length : 0
    },
    diagnostics: {
      workerPath: path.relative(process.cwd(), input.workerPath),
      pythonExecutable: input.pythonExecutable,
      durationMs: Date.now() - input.startedAt,
      ledgerPath: path.relative(process.cwd(), leadIntelLedgerPath()),
      note: compact(input.payload.note || '', 600) || undefined
    }
  };
}

function saveLeadIntelCrawlRecord(record: LeadIntelCrawlRecord) {
  const filePath = leadIntelLedgerPath();
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.appendFileSync(filePath, `${JSON.stringify(record)}\n`, 'utf8');
}

function formatLeadIntelTah(input: {
  record: LeadIntelCrawlRecord;
  title: string;
  concept: string;
  markdown: string;
  wasTrimmed: boolean;
}) {
  const sourceHash = crypto
    .createHash('sha256')
    .update(JSON.stringify({ markdown: input.markdown, json: input.record.output.json }))
    .digest('hex');
  const aliases = uniqueStrings([
    input.concept,
    input.record.hostname,
    input.record.sourceType,
    ...Object.values(input.record.entityHints).map((value) => String(value || '')),
    ...keywordsFromText(input.title),
  ]).join(', ');
  const trimNote = input.wasTrimmed
    ? 'NOTE: Content was trimmed by the lead-intel TAH importer. Re-import with a larger maxChars value for full context.\n\n'
    : '';

  return [
    `TITLE: ${input.title}`,
    `CONCEPT: ${input.concept}`,
    `ALIASES: ${aliases}`,
    `DOMAIN: lead_intelligence`,
    `TRUST: crawl4ai_operator_approved`,
    `VITALITY: draft`,
    `SOURCE_TYPE: crawl4ai_import`,
    `SOURCE_URL: ${input.record.url}`,
    `SOURCE_HOST: ${input.record.hostname}`,
    `SOURCE_RECORD_ID: ${input.record.id}`,
    `SOURCE_SHA256: ${sourceHash}`,
    `IMPORTED_AT: ${new Date().toISOString()}`,
    '',
    'PURPOSE:',
    'Use this crawled source as lead-intelligence context. Prefer explicit source facts over inference, preserve provenance, and flag stale or ambiguous claims.',
    '',
    'CRAWL METADATA:',
    `- Source type: ${input.record.sourceType}`,
    `- Extraction mode: ${input.record.extractionMode}`,
    `- Crawled at: ${input.record.createdAt}`,
    `- Description: ${input.record.output.description || 'None captured.'}`,
    `- Word count: ${input.record.output.wordCount}`,
    '',
    'STRUCTURED SIGNALS:',
    JSON.stringify(input.record.output.json || {}, null, 2),
    '',
    'CRAWLED MARKDOWN:',
    `${trimNote}${input.markdown}`,
    '',
  ].join('\n');
}

function forgeLeadIntelBinaryTah(input: {
  cartridge: string;
  outputPath: string;
  keywords: string[];
}) {
  const tahInputs = createTahInputsFromText(input.cartridge, uniqueStrings(input.keywords));
  const buffer = new TAHBuilder().forge(tahInputs);
  fs.mkdirSync(path.dirname(input.outputPath), { recursive: true });
  fs.writeFileSync(input.outputPath, buffer);

  return {
    byteSize: buffer.length,
    shardCount: tahInputs.length,
  };
}

function parseWorkerPayload(stdout: string): WorkerPayload {
  const trimmed = stdout.trim();
  if (!trimmed) return { status: 'unavailable', note: 'Crawl4AI worker returned no output.' };

  try {
    return JSON.parse(trimmed) as WorkerPayload;
  } catch {
    return {
      status: 'unavailable',
      note: 'Crawl4AI worker returned non-JSON output.',
      markdown: compact(trimmed, 6_000)
    };
  }
}

export function requestAllowlistIsTrusted() {
  return process.env.LEAD_INTEL_TRUST_REQUEST_ALLOWLIST === 'true' || process.env.NODE_ENV !== 'production';
}

function readLeadIntelRecords(filePath: string): LeadIntelCrawlRecord[] {
  return fs.readFileSync(filePath, 'utf8')
    .split(/\r?\n/g)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line) as LeadIntelCrawlRecord;
      } catch {
        return null;
      }
    })
    .filter((record): record is LeadIntelCrawlRecord => Boolean(record?.id && record?.framework === 'crawl4ai'));
}

function allowedDomainsFromEnv() {
  return (process.env.LEAD_INTEL_ALLOWED_DOMAINS || '')
    .split(',')
    .map((domain) => normalizeDomain(domain))
    .filter(Boolean);
}

function trustedRequestAllowlist(allowedDomains: string[]) {
  if (!requestAllowlistIsTrusted()) return [];
  return allowedDomains.map((domain) => normalizeDomain(domain)).filter(Boolean);
}

function domainIsAllowed(hostname: string, allowedDomains: string[]) {
  return allowedDomains.some((domain) => hostname === domain || hostname.endsWith(`.${domain}`));
}

function normalizeDomain(domain: string) {
  return String(domain || '').trim().toLowerCase().replace(/^\*\./, '');
}

function isPrivateHostname(hostname: string) {
  if (PRIVATE_HOST_PATTERNS.some((pattern) => pattern.test(hostname))) return true;
  if (hostname.endsWith('.local') || hostname.endsWith('.internal')) return true;
  return false;
}

function sanitizeHints(hints: LeadIntelCrawlInput['entityHints']) {
  const sanitized: Record<string, string | number | boolean | null> = {};
  for (const [key, value] of Object.entries(hints || {})) {
    if (value === undefined) continue;
    sanitized[compact(key, 80)] = typeof value === 'string' ? compact(value, 300) : value;
  }
  return sanitized;
}

function sanitizeLinks(links: Array<{ href: string; text?: string | null }>) {
  return links
    .filter((link) => typeof link?.href === 'string' && link.href.length > 0)
    .slice(0, 40)
    .map((link) => ({
      href: compact(link.href, 500),
      text: link.text ? compact(link.text, 160) : null
    }));
}

function countBy<T>(items: T[], keyForItem: (item: T) => string) {
  return items.reduce<Record<string, number>>((counts, item) => {
    const key = keyForItem(item);
    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {});
}

function skippedImport(reason: string, recordId: string | null = null): LeadIntelTahImportResult {
  return {
    status: 'skipped',
    outputPath: null,
    sourceOutputPath: null,
    binaryOutputPath: null,
    recordId,
    concept: null,
    title: null,
    markdownChars: 0,
    writtenChars: 0,
    binaryByteSize: 0,
    binaryShardCount: 0,
    reason,
  };
}

function titleFromUrl(urlValue: string) {
  try {
    const parsed = new URL(urlValue);
    const lastPath = parsed.pathname.split('/').filter(Boolean).at(-1) || parsed.hostname;
    return lastPath.replace(/[-_]+/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
  } catch {
    return 'Lead Intelligence Crawl';
  }
}

function slugify(value: string) {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return slug || 'lead_intel_crawl';
}

function keywordsFromText(value: string) {
  return value
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length >= 3)
    .slice(0, 8);
}

function uniqueStrings(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function isUnavailableError(error: unknown) {
  if (!(error instanceof Error)) return false;
  return /ENOENT|crawl4ai|No module named|not found|returned no output/i.test(error.message);
}

function workerStatusFor(status: WorkerPayload['status']): LeadIntelCrawlRecord['status'] {
  if (status === 'unavailable') return 'unavailable';
  if (status === 'failed') return 'failed';
  return 'completed';
}

function clampInteger(value: number, min: number, max: number) {
  const parsed = Number.isFinite(value) ? Math.round(value) : min;
  return Math.min(max, Math.max(min, parsed));
}

function compact(value: string, limit: number) {
  const cleaned = value.replace(/\s+/g, ' ').trim();
  return cleaned.length > limit ? `${cleaned.slice(0, limit - 3)}...` : cleaned;
}

function compactMarkdown(value: string, limit: number) {
  const cleaned = value
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{4,}/g, '\n\n\n')
    .trim();
  return cleaned.length > limit ? `${cleaned.slice(0, limit - 3)}...` : cleaned;
}

function hashId(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }

  return (hash >>> 0).toString(36);
}
