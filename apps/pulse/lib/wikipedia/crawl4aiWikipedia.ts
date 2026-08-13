import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { createTahInputsFromText } from '@/lib/core/tah_ingest';
import { TAHBuilder } from '@/lib/core/tah_builder';
import { supabaseAdmin } from '@/lib/supabase';
import {
  crawlLeadIntelligence,
  type LeadIntelCrawlRecord,
} from '@/lib/lead-intel/crawlLead';

export type WikipediaPage = {
  pageid: number;
  title: string;
  url: string;
};

export type WikipediaRetry = WikipediaPage & {
  attempts: number;
  lastError: string;
};

export type WikipediaIngestionState = {
  version: 1;
  language: string;
  continuation: string | null;
  complete: boolean;
  startedAt: string;
  updatedAt: string;
  runCount: number;
  batchCount: number;
  enumeratedCount: number;
  crawledCount: number;
  importedCount: number;
  crawlFailureCount: number;
  terminalFailureCount: number;
  retryQueue: WikipediaRetry[];
};

export type WikipediaBatchResult = {
  status: 'imported' | 'empty' | 'complete' | 'replayed';
  batchId: string | null;
  cartridgePath: string | null;
  manifestPath: string | null;
  articleCount: number;
  failureCount: number;
  state: WikipediaIngestionState;
};

type WikipediaPageBatch = {
  pages: WikipediaPage[];
  continuation: string | null;
};

type WikipediaCrawlSuccess = {
  page: WikipediaPage;
  recordId: string;
  title: string;
  markdown: string;
  crawledAt: string;
};

type WikipediaManifest = {
  version: 1;
  batchId: string;
  checkpointKey: string;
  language: string;
  createdAt: string;
  articles: Array<Omit<WikipediaCrawlSuccess, 'markdown'> & { markdownChars: number }>;
  failures: WikipediaRetry[];
  cartridgePath: string | null;
  stateAfter: WikipediaIngestionState;
};

export type WikipediaIngestionOptions = {
  language?: string;
  batchSize?: number;
  retrySlots?: number;
  maxAttempts?: number;
  requestDelayMs?: number;
  outputDir?: string;
  statePath?: string;
  listPages?: (input: {
    language: string;
    continuation: string | null;
    limit: number;
  }) => Promise<WikipediaPageBatch>;
  crawlPage?: (page: WikipediaPage, language: string) => Promise<LeadIntelCrawlRecord>;
};

const DEFAULT_BATCH_SIZE = 10;
const DEFAULT_RETRY_SLOTS = 2;
const DEFAULT_MAX_ATTEMPTS = 3;
const DEFAULT_REQUEST_DELAY_MS = 1_000;

export async function runWikipediaIngestionBatch(
  options: WikipediaIngestionOptions = {},
): Promise<WikipediaBatchResult> {
  const language = normalizeLanguage(options.language || process.env.WIKIPEDIA_LANGUAGE || 'en');
  const batchSize = clampInteger(options.batchSize || numberFromEnv('WIKIPEDIA_BATCH_SIZE') || DEFAULT_BATCH_SIZE, 1, 50);
  const retrySlots = clampInteger(options.retrySlots ?? DEFAULT_RETRY_SLOTS, 0, batchSize);
  const maxAttempts = clampInteger(options.maxAttempts || DEFAULT_MAX_ATTEMPTS, 1, 10);
  const requestDelayMs = clampInteger(options.requestDelayMs ?? numberFromEnv('WIKIPEDIA_REQUEST_DELAY_MS') ?? DEFAULT_REQUEST_DELAY_MS, 0, 60_000);
  const outputDir = path.resolve(options.outputDir || wikipediaOutputDir());
  const statePath = path.resolve(options.statePath || wikipediaStatePath());
  const state = loadWikipediaIngestionState({ language, statePath });
  const retryPages = state.retryQueue.slice(0, retrySlots);
  const freshLimit = Math.max(0, batchSize - retryPages.length);
  const listPages = options.listPages || listWikipediaPages;
  const freshBatch = state.complete || freshLimit === 0
    ? { pages: [], continuation: state.continuation }
    : await listPages({ language, continuation: state.continuation, limit: freshLimit });

  if (!retryPages.length && !freshBatch.pages.length) {
    const completeState = {
      ...state,
      continuation: freshBatch.continuation,
      complete: freshBatch.continuation === null,
      updatedAt: new Date().toISOString(),
      runCount: state.runCount + 1,
    };
    saveWikipediaIngestionState(completeState, statePath);
    return publishWikipediaHeartbeat({
      status: completeState.complete ? 'complete' : 'empty',
      batchId: null,
      cartridgePath: null,
      manifestPath: null,
      articleCount: 0,
      failureCount: 0,
      state: completeState,
    });
  }

  const pages = uniquePages([...retryPages, ...freshBatch.pages]);
  const checkpointKey = createCheckpointKey(state, retryPages, freshBatch);
  const batchId = createBatchId(language, checkpointKey);
  const manifestPath = path.join(outputDir, `${batchId}.manifest.json`);
  const replay = readReplayManifest(manifestPath, checkpointKey);
  if (replay) {
    saveWikipediaIngestionState(replay.stateAfter, statePath);
    return publishWikipediaHeartbeat({
      status: 'replayed',
      batchId,
      cartridgePath: replay.cartridgePath,
      manifestPath: path.relative(process.cwd(), manifestPath),
      articleCount: replay.articles.length,
      failureCount: replay.failures.length,
      state: replay.stateAfter,
    });
  }

  const crawlPage = options.crawlPage || crawlWikipediaPage;
  const successes: WikipediaCrawlSuccess[] = [];
  const failures: WikipediaRetry[] = [];

  for (let index = 0; index < pages.length; index += 1) {
    const page = pages[index];
    const previousRetry = state.retryQueue.find((item) => item.pageid === page.pageid);
    try {
      const record = await crawlPage(page, language);
      const markdown = record.output.markdown?.trim() || '';
      if (record.status !== 'completed' || !markdown) {
        throw new Error(record.diagnostics.note || `Crawl finished with status ${record.status}.`);
      }
      successes.push({
        page,
        recordId: record.id,
        title: record.output.title || page.title,
        markdown,
        crawledAt: record.createdAt,
      });
    } catch (error) {
      failures.push({
        ...page,
        attempts: (previousRetry?.attempts || 0) + 1,
        lastError: compactError(error),
      });
    }

    if (requestDelayMs > 0 && index < pages.length - 1) {
      await delay(requestDelayMs);
    }
  }

  const activeFailures = failures.filter((failure) => failure.attempts < maxAttempts);
  const terminalFailures = failures.filter((failure) => failure.attempts >= maxAttempts);
  const processedPageIds = new Set(pages.map((page) => page.pageid));
  const untouchedRetries = state.retryQueue.filter((item) => !processedPageIds.has(item.pageid));
  const retryQueue = uniqueRetries([...untouchedRetries, ...activeFailures]);
  const now = new Date().toISOString();
  const stateAfter: WikipediaIngestionState = {
    ...state,
    continuation: freshBatch.pages.length ? freshBatch.continuation : state.continuation,
    complete: state.complete || (freshBatch.pages.length > 0 && freshBatch.continuation === null),
    updatedAt: now,
    runCount: state.runCount + 1,
    batchCount: state.batchCount + (successes.length ? 1 : 0),
    enumeratedCount: state.enumeratedCount + freshBatch.pages.length,
    crawledCount: state.crawledCount + successes.length,
    importedCount: state.importedCount + successes.length,
    crawlFailureCount: state.crawlFailureCount + failures.length,
    terminalFailureCount: state.terminalFailureCount + terminalFailures.length,
    retryQueue,
  };

  fs.mkdirSync(outputDir, { recursive: true });
  const cartridgePath = successes.length
    ? await forgeWikipediaBatchCartridge({ batchId, language, articles: successes, outputDir })
    : null;
  const manifest: WikipediaManifest = {
    version: 1,
    batchId,
    checkpointKey,
    language,
    createdAt: now,
    articles: successes.map(({ markdown, ...article }) => ({
      ...article,
      markdownChars: markdown.length,
    })),
    failures,
    cartridgePath,
    stateAfter,
  };
  writeJsonAtomically(manifestPath, manifest);
  saveWikipediaIngestionState(stateAfter, statePath);

  return publishWikipediaHeartbeat({
    status: successes.length ? 'imported' : 'empty',
    batchId,
    cartridgePath,
    manifestPath: path.relative(process.cwd(), manifestPath),
    articleCount: successes.length,
    failureCount: failures.length,
    state: stateAfter,
  });
}

async function publishWikipediaHeartbeat(result: WikipediaBatchResult): Promise<WikipediaBatchResult> {
  const crawlerId = process.env.PULSE_CRAWLER_ID || `wikipedia-${result.state.language}`;
  const payload = {
    crawler_id: crawlerId,
    status: result.status,
    updated_at: new Date().toISOString(),
    payload: {
      batchId: result.batchId,
      articleCount: result.articleCount,
      failureCount: result.failureCount,
      state: result.state,
    },
  };

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (supabaseUrl && serviceRoleKey) {
    try {
      const response = await fetch(`${supabaseUrl.replace(/\/$/, '')}/rest/v1/crawler_heartbeats?on_conflict=crawler_id`, {
        method: 'POST',
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
          'Content-Type': 'application/json',
          Prefer: 'resolution=merge-duplicates,return=minimal',
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(5_000),
      });
      if (!response.ok) throw new Error(`Supabase heartbeat returned ${response.status}`);
      return result;
    } catch (error) {
      console.warn('[WIKIPEDIA_HEARTBEAT_SUPABASE_FAILED]', error instanceof Error ? error.message : 'unknown error');
    }
  }

  const endpoint = process.env.PULSE_CRAWLER_HEARTBEAT_URL || process.env.PULSE_HEARTBEAT_URL;
  const token = process.env.PULSE_CRAWLER_HEARTBEAT_TOKEN || process.env.PULSE_HEARTBEAT_TOKEN;
  if (!endpoint || !token) return result;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Crawler-Token': token },
      body: JSON.stringify({
        crawlerId,
        status: result.status,
        batchId: result.batchId,
        articleCount: result.articleCount,
        failureCount: result.failureCount,
        state: result.state,
      }),
      signal: AbortSignal.timeout(5_000),
    });
    if (!response.ok) throw new Error(`heartbeat endpoint returned ${response.status}`);
  } catch (error) {
    console.warn('[WIKIPEDIA_HEARTBEAT_FAILED]', error instanceof Error ? error.message : 'unknown error');
  }

  return result;
}

export async function listWikipediaPages(input: {
  language: string;
  continuation: string | null;
  limit: number;
}): Promise<WikipediaPageBatch> {
  const language = normalizeLanguage(input.language);
  const limit = clampInteger(input.limit, 1, 50);
  let continuation = input.continuation;

  for (let gap = 0; gap < 20; gap += 1) {
    const url = new URL(`https://${language}.wikipedia.org/w/api.php`);
    url.searchParams.set('action', 'query');
    url.searchParams.set('format', 'json');
    url.searchParams.set('formatversion', '2');
    url.searchParams.set('list', 'allpages');
    url.searchParams.set('apnamespace', '0');
    url.searchParams.set('apfilterredir', 'nonredirects');
    url.searchParams.set('aplimit', String(limit));
    if (continuation) url.searchParams.set('apcontinue', continuation);

    const response = await fetch(url, {
      headers: {
        'User-Agent': process.env.WIKIPEDIA_USER_AGENT || 'SunsetPulse-TAH-Crawler/1.0 (https://sunsetpulse.app/tah)',
        Accept: 'application/json',
      },
    });
    if (!response.ok) {
      throw new Error(`Wikipedia page enumeration failed with ${response.status}.`);
    }

    const payload = await response.json() as {
      query?: { allpages?: Array<{ pageid?: number; title?: string }> };
      continue?: { apcontinue?: string };
    };
    const pages = (payload.query?.allpages || [])
      .filter((page): page is { pageid: number; title: string } => Number.isInteger(page.pageid) && Boolean(page.title))
      .map((page) => ({
        pageid: page.pageid,
        title: page.title,
        url: wikipediaArticleUrl(language, page.title),
      }));
    const nextContinuation = payload.continue?.apcontinue || null;
    if (pages.length || nextContinuation === null) {
      return { pages, continuation: nextContinuation };
    }
    continuation = nextContinuation;
  }

  return { pages: [], continuation };
}

export function loadWikipediaIngestionState(input: {
  language?: string;
  statePath?: string;
} = {}): WikipediaIngestionState {
  const language = normalizeLanguage(input.language || process.env.WIKIPEDIA_LANGUAGE || 'en');
  const statePath = path.resolve(input.statePath || wikipediaStatePath());
  if (fs.existsSync(statePath)) {
    const parsed = JSON.parse(fs.readFileSync(statePath, 'utf8')) as WikipediaIngestionState;
    if (parsed.version !== 1 || parsed.language !== language || !Array.isArray(parsed.retryQueue)) {
      throw new Error(`Wikipedia ingestion state at ${statePath} is incompatible with language ${language}.`);
    }
    return parsed;
  }

  const now = new Date().toISOString();
  return {
    version: 1,
    language,
    continuation: null,
    complete: false,
    startedAt: now,
    updatedAt: now,
    runCount: 0,
    batchCount: 0,
    enumeratedCount: 0,
    crawledCount: 0,
    importedCount: 0,
    crawlFailureCount: 0,
    terminalFailureCount: 0,
    retryQueue: [],
  };
}

export function saveWikipediaIngestionState(state: WikipediaIngestionState, statePath = wikipediaStatePath()) {
  writeJsonAtomically(path.resolve(statePath), state);
}

export function wikipediaOutputDir() {
  return path.resolve(
    process.env.WIKIPEDIA_TAH_OUTPUT_DIR || path.join(process.cwd(), 'cartridges', 'wikipedia'),
  );
}

export function wikipediaStatePath() {
  return path.resolve(
    process.env.WIKIPEDIA_INGESTION_STATE_PATH || path.join(wikipediaOutputDir(), 'ingestion-state.json'),
  );
}

async function crawlWikipediaPage(page: WikipediaPage, language: string) {
  return crawlLeadIntelligence({
    url: page.url,
    sourceType: 'other',
    entityHints: {
      content_profile: 'wikipedia',
      source: 'wikipedia',
      language,
      page_id: page.pageid,
      article_title: page.title,
      query: page.title,
    },
    extractionMode: 'markdown',
    maxPages: 1,
    timeoutMs: 120_000,
    allowedDomains: ['wikipedia.org'],
  });
}

async function forgeWikipediaBatchCartridge(input: {
  batchId: string;
  language: string;
  articles: WikipediaCrawlSuccess[];
  outputDir: string;
}) {
  const tahInputs = input.articles.flatMap((article) => {
    const sourceText = [
      `TITLE: ${article.title}`,
      `DOMAIN: wikipedia`,
      `LANGUAGE: ${input.language}`,
      `TRUST: wikipedia_crawl4ai`,
      `SOURCE_URL: ${article.page.url}`,
      `SOURCE_PAGE_ID: ${article.page.pageid}`,
      `CRAWLED_AT: ${article.crawledAt}`,
      '',
      article.markdown,
    ].join('\n');
    const sourceHeader = [
      `TITLE: ${article.title}`,
      `SOURCE_URL: ${article.page.url}`,
      `SOURCE_PAGE_ID: ${article.page.pageid}`,
      '',
    ].join('\n');
    return createTahInputsFromText(sourceText, wikipediaKeywords(article.title)).map((shard) => ({
      ...shard,
      data: `${sourceHeader}${shard.data}`,
    }));
  });
  const outputPath = path.join(input.outputDir, `${input.batchId}.tah`);
  const buffer = new TAHBuilder().forge(tahInputs);
  writeBufferAtomically(outputPath, buffer);
  try {
    const { error } = await supabaseAdmin.storage.from('cartridges').upload(path.basename(outputPath), buffer, {
      contentType: 'application/octet-stream',
      upsert: true,
    });
    if (error) throw error;
  } catch (error) {
    console.warn('[WIKIPEDIA_CARTRIDGE_UPLOAD_FAILED]', error instanceof Error ? error.message : 'unknown error');
  }
  return path.relative(process.cwd(), outputPath);
}

function createCheckpointKey(
  state: WikipediaIngestionState,
  retryPages: WikipediaRetry[],
  freshBatch: WikipediaPageBatch,
) {
  return JSON.stringify({
    language: state.language,
    continuationBefore: state.continuation,
    retryPages: retryPages.map((page) => [page.pageid, page.attempts]),
    freshPages: freshBatch.pages.map((page) => page.pageid),
    continuationAfter: freshBatch.continuation,
  });
}

function createBatchId(language: string, checkpointKey: string) {
  return `wiki_${language}_${crypto.createHash('sha256').update(checkpointKey).digest('hex').slice(0, 16)}`;
}

function readReplayManifest(filePath: string, checkpointKey: string): WikipediaManifest | null {
  if (!fs.existsSync(filePath)) return null;
  try {
    const manifest = JSON.parse(fs.readFileSync(filePath, 'utf8')) as WikipediaManifest;
    return manifest.version === 1 && manifest.checkpointKey === checkpointKey ? manifest : null;
  } catch {
    return null;
  }
}

function wikipediaArticleUrl(language: string, title: string) {
  return `https://${language}.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`;
}

function wikipediaKeywords(title: string) {
  return [...new Set([
    title,
    `wikipedia ${title}`,
    ...title.toLowerCase().split(/[^a-z0-9]+/).filter((word) => word.length > 2),
  ])];
}

function normalizeLanguage(value: string) {
  const language = String(value || '').trim().toLowerCase();
  if (!/^[a-z][a-z0-9-]{1,11}$/.test(language)) {
    throw new Error('Wikipedia language must be a valid language subdomain.');
  }
  return language;
}

function uniquePages(pages: WikipediaPage[]) {
  const seen = new Set<number>();
  return pages.filter((page) => {
    if (seen.has(page.pageid)) return false;
    seen.add(page.pageid);
    return true;
  });
}

function uniqueRetries(retries: WikipediaRetry[]) {
  const byId = new Map<number, WikipediaRetry>();
  for (const retry of retries) byId.set(retry.pageid, retry);
  return [...byId.values()].slice(0, 10_000);
}

function writeJsonAtomically(filePath: string, value: unknown) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const temporaryPath = `${filePath}.${process.pid}.tmp`;
  fs.writeFileSync(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  fs.renameSync(temporaryPath, filePath);
}

function writeBufferAtomically(filePath: string, value: Buffer) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const temporaryPath = `${filePath}.${process.pid}.tmp`;
  fs.writeFileSync(temporaryPath, value);
  fs.renameSync(temporaryPath, filePath);
}

function compactError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || 'Unknown Crawl4AI failure.');
  return message.replace(/\s+/g, ' ').trim().slice(0, 600);
}

function numberFromEnv(name: string) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value >= 0 ? value : null;
}

function clampInteger(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, Math.round(value)));
}

function delay(milliseconds: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, milliseconds));
}
