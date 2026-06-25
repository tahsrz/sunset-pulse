import fs from 'fs';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';

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
