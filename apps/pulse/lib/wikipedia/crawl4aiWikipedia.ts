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
  failureClass?: 'transient' | 'permanent';
  nextAttemptAt?: string;
};

export type WikipediaDemand = {
  query: string;
  reason: string;
  requestedAt: string;
  attempts: number;
};

type WikipediaDemandQueue = {
  version: 1;
  pending: WikipediaDemand[];
  completed: string[];
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
  health: WikipediaIngestionHealth;
};

export type WikipediaIngestionHealth = {
  status: 'healthy' | 'degraded' | 'paused' | 'dependency_error';
  consecutiveFailureBatches: number;
  lastSuccessfulImportAt: string | null;
  retryBacklog: number;
  retryDrainRate: number | null;
  retryBacklogDelta: number;
  throughputPerHour: number;
  cartridgeBytes: number;
  estimatedCompletionAt: string | null;
  pausedAt: string | null;
  lastControlAt: string | null;
  lastError: string | null;
};

export type WikipediaBatchResult = {
  status: 'imported' | 'empty' | 'complete' | 'replayed' | 'paused' | 'dependency_error';
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
  demandQueries?: string[];
};

export type WikipediaIngestionOptions = {
  language?: string;
  batchSize?: number;
  retrySlots?: number;
  demandSlots?: number;
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
  resolveDemandPage?: (query: string, language: string) => Promise<WikipediaPage | null>;
  demandPath?: string;
};

const DEFAULT_BATCH_SIZE = 10;
const DEFAULT_MAX_ATTEMPTS = 3;
const DEFAULT_REQUEST_DELAY_MS = 1_000;
const DEFAULT_WIKIPEDIA_ARTICLE_ESTIMATE = 6_900_000;
const DEFAULT_MAX_DEMAND_ATTEMPTS = 5;

export async function runWikipediaIngestionBatch(
  options: WikipediaIngestionOptions = {},
): Promise<WikipediaBatchResult> {
  const language = normalizeLanguage(options.language || process.env.WIKIPEDIA_LANGUAGE || 'en');
  const batchSize = clampInteger(options.batchSize || numberFromEnv('WIKIPEDIA_BATCH_SIZE') || DEFAULT_BATCH_SIZE, 1, 50);
  const maxAttempts = clampInteger(options.maxAttempts || DEFAULT_MAX_ATTEMPTS, 1, 10);
  const requestDelayMs = clampInteger(options.requestDelayMs ?? numberFromEnv('WIKIPEDIA_REQUEST_DELAY_MS') ?? DEFAULT_REQUEST_DELAY_MS, 0, 60_000);
  const outputDir = path.resolve(options.outputDir || wikipediaOutputDir());
  const statePath = path.resolve(options.statePath || wikipediaStatePath());
  const demandPath = path.resolve(options.demandPath || wikipediaDemandPath());
  let state = loadWikipediaIngestionState({ language, statePath });
  if (state.health.status === 'paused') state = await applyRemoteCrawlerControl(state, statePath);
  if (state.health.status === 'paused') {
    return publishWikipediaHeartbeat({
      status: 'paused', batchId: null, cartridgePath: null, manifestPath: null,
      articleCount: 0, failureCount: 0, state,
    });
  }
  const eligibleRetries = options.retrySlots !== undefined
    ? state.retryQueue
    : state.retryQueue.filter((retry) => !retry.nextAttemptAt || Date.parse(retry.nextAttemptAt) <= Date.now());
  const drainingRetryBacklog = options.retrySlots === undefined && state.retryQueue.length > 0;
  const demandQueue = loadWikipediaDemandQueue(demandPath);
  const demandSlots = clampInteger(
    options.demandSlots ?? (options.listPages ? 0 : numberFromEnv('WIKIPEDIA_DEMAND_SLOTS') ?? 2),
    0,
    batchSize,
  );
  const demandItems = demandQueue.pending.slice(0, demandSlots);
  const retrySlots = clampInteger(
    options.retrySlots ?? (drainingRetryBacklog ? batchSize - demandItems.length : 0),
    0,
    batchSize - demandItems.length,
  );
  const retryPages = eligibleRetries.slice(0, retrySlots);
  const resolveDemandPage = options.resolveDemandPage || resolveWikipediaDemandPage;
  const demandPages: WikipediaPage[] = [];
  const unresolvedDemand: WikipediaDemand[] = [];
  for (const demand of demandItems) {
    try {
      const resolved = await resolveDemandPage(demand.query, language);
      if (resolved) demandPages.push(resolved);
      else if (demand.attempts + 1 < DEFAULT_MAX_DEMAND_ATTEMPTS) unresolvedDemand.push({ ...demand, attempts: demand.attempts + 1 });
    } catch {
      if (demand.attempts + 1 < DEFAULT_MAX_DEMAND_ATTEMPTS) unresolvedDemand.push({ ...demand, attempts: demand.attempts + 1 });
    }
  }
  const freshLimit = drainingRetryBacklog ? 0 : Math.max(0, batchSize - retryPages.length - demandPages.length);
  const listPages = options.listPages || listWikipediaPages;
  const freshBatch = state.complete || freshLimit === 0
    ? { pages: [], continuation: state.continuation }
    : await listPages({ language, continuation: state.continuation, limit: freshLimit });

  if (!retryPages.length && !demandPages.length && !freshBatch.pages.length) {
    if (demandItems.length) updateWikipediaDemandAfterBatch(demandPath, demandItems, unresolvedDemand);
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

  const pages = uniquePages([...retryPages, ...demandPages, ...freshBatch.pages]);
  const checkpointKey = createCheckpointKey(state, retryPages, freshBatch, demandItems);
  const batchId = createBatchId(language, checkpointKey);
  const manifestPath = path.join(outputDir, `${batchId}.manifest.json`);
  const replay = readReplayManifest(manifestPath, checkpointKey);
  if (replay) {
    const replayState = {
      ...replay.stateAfter,
      health: normalizeIngestionHealth(replay.stateAfter.health, replay.stateAfter.retryQueue.length),
    };
    saveWikipediaIngestionState(replayState, statePath);
    completeWikipediaDemand(demandPath, replay.demandQueries || []);
    return publishWikipediaHeartbeat({
      status: 'replayed',
      batchId,
      cartridgePath: replay.cartridgePath,
      manifestPath: path.relative(process.cwd(), manifestPath),
      articleCount: replay.articles.length,
      failureCount: replay.failures.length,
      state: replayState,
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
      if (record.status === 'unavailable') {
        throw new WikipediaCrawlerUnavailableError(
          record.diagnostics.note || 'The Crawl4AI worker is unavailable.',
        );
      }
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
      if (error instanceof WikipediaCrawlerUnavailableError) {
        await publishWikipediaHeartbeat({
          status: 'dependency_error',
          batchId: null,
          cartridgePath: null,
          manifestPath: null,
          articleCount: 0,
          failureCount: 0,
          state: {
            ...state,
            health: {
              ...state.health,
              status: 'dependency_error',
              lastError: error.message,
            },
          },
        });
        throw error;
      }
      const lastError = compactError(error);
      const attempts = (previousRetry?.attempts || 0) + 1;
      const failureClass = classifyCrawlFailure(lastError);
      failures.push({
        ...page,
        attempts,
        lastError,
        failureClass,
        nextAttemptAt: failureClass === 'transient'
          ? new Date(Date.now() + retryBackoffMs(attempts)).toISOString()
          : undefined,
      });
    }

    if (requestDelayMs > 0 && index < pages.length - 1) {
      await delay(requestDelayMs);
    }
  }

  const activeFailures = failures.filter((failure) => failure.failureClass !== 'permanent' && failure.attempts < maxAttempts);
  const terminalFailures = failures.filter((failure) => failure.failureClass === 'permanent' || failure.attempts >= maxAttempts);
  const processedPageIds = new Set(pages.map((page) => page.pageid));
  const untouchedRetries = state.retryQueue.filter((item) => !processedPageIds.has(item.pageid));
  const retryQueue = uniqueRetries([...untouchedRetries, ...activeFailures]);
  const now = new Date().toISOString();
  const recoveredRetries = retryPages.filter((retry) => successes.some((success) => success.page.pageid === retry.pageid)).length;
  const consecutiveFailureBatches = failures.length > 0 && successes.length === 0
    ? state.health.consecutiveFailureBatches + 1
    : 0;
  const paused = consecutiveFailureBatches >= 3;
  const cartridgeBytes = state.health.cartridgeBytes + (cartridgeSizeEstimate(successes));
  const elapsedHours = Math.max((Date.now() - Date.parse(state.startedAt)) / 3_600_000, 1 / 60);
  const throughputPerHour = Math.round((state.importedCount + successes.length) / elapsedHours);
  const articleEstimate = numberFromEnv('WIKIPEDIA_ARTICLE_ESTIMATE') || DEFAULT_WIKIPEDIA_ARTICLE_ESTIMATE;
  const remainingHours = throughputPerHour > 0
    ? Math.max(0, articleEstimate - state.importedCount - successes.length) / throughputPerHour
    : null;
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
    health: {
      status: paused ? 'paused' : failures.length ? 'degraded' : 'healthy',
      consecutiveFailureBatches,
      lastSuccessfulImportAt: successes.length ? now : state.health.lastSuccessfulImportAt,
      retryBacklog: retryQueue.length,
      retryDrainRate: retryPages.length ? Math.round((recoveredRetries / retryPages.length) * 100) : null,
      retryBacklogDelta: retryQueue.length - state.retryQueue.length,
      throughputPerHour,
      cartridgeBytes,
      estimatedCompletionAt: remainingHours === null ? null : new Date(Date.now() + remainingHours * 3_600_000).toISOString(),
      pausedAt: paused ? now : null,
      lastControlAt: state.health.lastControlAt,
      lastError: failures[0]?.lastError || null,
    },
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
    demandQueries: demandItems.filter((item) => !unresolvedDemand.some((unresolved) => unresolved.query === item.query)).map((item) => item.query),
  };
  await updateWikipediaSearchCatalog(outputDir, manifest);
  // The replay marker is committed only after the cartridge is queryable.
  // A failed catalog update must be retried rather than replayed as complete.
  writeJsonAtomically(manifestPath, manifest);
  updateWikipediaDemandAfterBatch(demandPath, demandItems, unresolvedDemand);
  saveWikipediaIngestionState(stateAfter, statePath);

  return publishWikipediaHeartbeat({
    status: paused ? 'paused' : successes.length ? 'imported' : 'empty',
    batchId,
    cartridgePath,
    manifestPath: path.relative(process.cwd(), manifestPath),
    articleCount: successes.length,
    failureCount: failures.length,
    state: stateAfter,
  });
}

class WikipediaCrawlerUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WikipediaCrawlerUnavailableError';
  }
}

async function publishWikipediaHeartbeat(result: WikipediaBatchResult): Promise<WikipediaBatchResult> {
  const crawlerId = process.env.PULSE_CRAWLER_ID || `wikipedia-${result.state.language}`;
  let existingControl: Record<string, unknown> | undefined;
  try {
    const { data } = await supabaseAdmin.from('crawler_heartbeats').select('payload').eq('crawler_id', crawlerId).maybeSingle();
    const payload = data?.payload as { control?: Record<string, unknown> } | null;
    existingControl = payload?.control;
  } catch { /* heartbeat publication remains best-effort */ }
  const payload = {
    crawler_id: crawlerId,
    status: result.status,
    updated_at: new Date().toISOString(),
    payload: {
      batchId: result.batchId,
      articleCount: result.articleCount,
      failureCount: result.failureCount,
      state: result.state,
      ...(existingControl ? { control: existingControl } : {}),
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

export async function resolveWikipediaDemandPage(query: string, language: string): Promise<WikipediaPage | null> {
  const normalizedLanguage = normalizeLanguage(language);
  const directCandidates = await lookupWikipediaDemandTitles(query, normalizedLanguage);
  const url = new URL(`https://${normalizedLanguage}.wikipedia.org/w/api.php`);
  url.searchParams.set('action', 'query');
  url.searchParams.set('format', 'json');
  url.searchParams.set('formatversion', '2');
  url.searchParams.set('list', 'search');
  url.searchParams.set('srnamespace', '0');
  url.searchParams.set('srlimit', '8');
  url.searchParams.set('srsearch', query.slice(0, 300));
  const response = await fetch(url, {
    headers: {
      'User-Agent': process.env.WIKIPEDIA_USER_AGENT || 'SunsetPulse-TAH-Crawler/1.0 (https://sunsetpulse.app/tah)',
      Accept: 'application/json',
    },
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`Wikipedia demand lookup failed with ${response.status}.`);
  const payload = await response.json() as { query?: { search?: Array<{ pageid?: number; title?: string }> } };
  const match = selectWikipediaDemandMatch(query, [...directCandidates, ...(payload.query?.search || [])]);
  return match?.pageid && match.title
    ? { pageid: match.pageid, title: match.title, url: wikipediaArticleUrl(normalizedLanguage, match.title) }
    : null;
}

async function lookupWikipediaDemandTitles(query: string, language: string) {
  const titles = wikipediaDemandTitleCandidates(query);
  if (!titles.length) return [];
  const url = new URL(`https://${language}.wikipedia.org/w/api.php`);
  url.searchParams.set('action', 'query');
  url.searchParams.set('format', 'json');
  url.searchParams.set('formatversion', '2');
  url.searchParams.set('redirects', '1');
  url.searchParams.set('titles', titles.join('|'));
  const response = await fetch(url, {
    headers: {
      'User-Agent': process.env.WIKIPEDIA_USER_AGENT || 'SunsetPulse-TAH-Crawler/1.0 (https://sunsetpulse.app/tah)',
      Accept: 'application/json',
    },
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) return [];
  const payload = await response.json() as { query?: { pages?: Array<{ pageid?: number; title?: string; missing?: boolean }> } };
  return (payload.query?.pages || []).filter((page) => !page.missing);
}

export function wikipediaDemandTitleCandidates(query: string) {
  const terms = demandTerms(normalizeDemandKey(query)).slice(0, 6);
  const candidates: string[] = [];
  for (let size = Math.min(3, terms.length); size >= 2; size -= 1) {
    for (let index = 0; index <= terms.length - size; index += 1) {
      candidates.push(terms.slice(index, index + size).join(' '));
    }
  }
  candidates.push(...terms);
  return [...new Set(candidates)].slice(0, 12);
}

export function selectWikipediaDemandMatch(
  query: string,
  candidates: Array<{ pageid?: number; title?: string }>,
) {
  const normalizedQuery = normalizeDemandKey(query);
  const queryTerms = demandTerms(normalizedQuery);
  return candidates
    .filter((candidate): candidate is { pageid: number; title: string } => Number.isInteger(candidate.pageid) && Boolean(candidate.title))
    .map((candidate) => {
      const title = normalizeDemandKey(candidate.title);
      const titleTerms = demandTerms(title);
      const matchingTerms = titleTerms.filter((term) => queryTerms.includes(term));
      const unmatchedTerms = titleTerms.length - matchingTerms.length;
      const coverage = matchingTerms.length / Math.max(1, titleTerms.length);
      const exactPhrase = title.length > 2 && normalizedQuery.includes(title);
      const focusWeight = matchingTerms.reduce((total, term) => {
        const index = queryTerms.indexOf(term);
        return total + (index < 0 ? 0 : queryTerms.length - index);
      }, 0);
      const score = (exactPhrase ? 40 : 0)
        + matchingTerms.length * 12
        + coverage * 30
        + focusWeight * 5
        - unmatchedTerms * 6
        - Math.max(0, titleTerms.length - 4);
      return { candidate, score, matchingTerms: matchingTerms.length, titleLength: title.length };
    })
    .filter((ranked) => ranked.matchingTerms > 0)
    .sort((left, right) => right.score - left.score || left.titleLength - right.titleLength)[0]?.candidate || null;
}

export function enqueueWikipediaDemand(
  queries: Array<{ query: string; reason?: string }>,
  demandPath = wikipediaDemandPath(),
) {
  const queue = loadWikipediaDemandQueue(demandPath);
  const pendingKeys = new Set(queue.pending.map((item) => normalizeDemandKey(item.query)));
  const now = new Date().toISOString();
  for (const input of queries) {
    const query = input.query.replace(/\s+/g, ' ').trim().slice(0, 300);
    const key = normalizeDemandKey(query);
    if (!key || pendingKeys.has(key)) continue;
    queue.completed = queue.completed.filter((completed) => normalizeDemandKey(completed) !== key);
    queue.pending.push({ query, reason: input.reason?.slice(0, 120) || 'retrieval miss', requestedAt: now, attempts: 0 });
    pendingKeys.add(key);
  }
  queue.pending = queue.pending.slice(0, 2_000);
  writeJsonAtomically(path.resolve(demandPath), queue);
  return queue;
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
    return { ...parsed, health: normalizeIngestionHealth(parsed.health, parsed.retryQueue.length) };
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
    health: normalizeIngestionHealth(undefined, 0),
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
    process.env.WIKIPEDIA_INGESTION_STATE_PATH
      || path.join(process.cwd(), '.pulse-local', 'wikipedia', 'ingestion-state.json'),
  );
}

export function wikipediaDemandPath() {
  return path.resolve(
    process.env.WIKIPEDIA_DEMAND_PATH
      || path.join(process.cwd(), '.pulse-local', 'wikipedia', 'demand-queue.json'),
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
  demandItems: WikipediaDemand[] = [],
) {
  return JSON.stringify({
    language: state.language,
    continuationBefore: state.continuation,
    retryPages: retryPages.map((page) => [page.pageid, page.attempts]),
    freshPages: freshBatch.pages.map((page) => page.pageid),
    continuationAfter: freshBatch.continuation,
    demandQueries: demandItems.map((item) => item.query),
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

function loadWikipediaDemandQueue(demandPath: string): WikipediaDemandQueue {
  try {
    const parsed = JSON.parse(fs.readFileSync(path.resolve(demandPath), 'utf8')) as WikipediaDemandQueue;
    if (parsed.version === 1 && Array.isArray(parsed.pending) && Array.isArray(parsed.completed)) return parsed;
  } catch {
    // Missing and malformed queues start empty; writes remain atomic.
  }
  return { version: 1, pending: [], completed: [] };
}

function updateWikipediaDemandAfterBatch(
  demandPath: string,
  attempted: WikipediaDemand[],
  unresolved: WikipediaDemand[],
) {
  const queue = loadWikipediaDemandQueue(demandPath);
  const attemptedKeys = new Set(attempted.map((item) => normalizeDemandKey(item.query)));
  const unresolvedKeys = new Set(unresolved.map((item) => normalizeDemandKey(item.query)));
  const completed = attempted.filter((item) => !unresolvedKeys.has(normalizeDemandKey(item.query))).map((item) => item.query);
  queue.pending = [...unresolved, ...queue.pending.filter((item) => !attemptedKeys.has(normalizeDemandKey(item.query)))];
  queue.completed = [...new Set([...queue.completed, ...completed])].slice(-10_000);
  writeJsonAtomically(path.resolve(demandPath), queue);
}

function completeWikipediaDemand(demandPath: string, queries: string[]) {
  if (!queries.length) return;
  const queue = loadWikipediaDemandQueue(demandPath);
  const completedKeys = new Set(queries.map(normalizeDemandKey));
  queue.pending = queue.pending.filter((item) => !completedKeys.has(normalizeDemandKey(item.query)));
  queue.completed = [...new Set([...queue.completed, ...queries])].slice(-10_000);
  writeJsonAtomically(path.resolve(demandPath), queue);
}

function normalizeDemandKey(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

const DEMAND_STOP_WORDS = new Set([
  'about', 'become', 'body', 'caused', 'convert', 'created', 'did', 'does', 'energy', 'explain',
  'from', 'historical', 'how', 'important', 'into', 'makes', 'originated', 'role', 'the', 'what',
  'when', 'where', 'which', 'why', 'with', 'work',
]);

function demandTerms(value: string) {
  return [...new Set(value.split(' ').filter((term) => term.length > 2 && !DEMAND_STOP_WORDS.has(term)))];
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

function normalizeIngestionHealth(value: WikipediaIngestionHealth | undefined, retryBacklog: number): WikipediaIngestionHealth {
  const consecutiveFailureBatches = Number(value?.consecutiveFailureBatches);
  const retryDrainRate = value?.retryDrainRate == null ? null : Number(value.retryDrainRate);
  return {
    status: value?.status || 'healthy',
    consecutiveFailureBatches: Number.isInteger(consecutiveFailureBatches) ? consecutiveFailureBatches : 0,
    lastSuccessfulImportAt: value?.lastSuccessfulImportAt || null,
    retryBacklog,
    retryDrainRate: retryDrainRate !== null && Number.isFinite(retryDrainRate) ? retryDrainRate : null,
    retryBacklogDelta: Number.isFinite(Number(value?.retryBacklogDelta)) ? Number(value?.retryBacklogDelta) : 0,
    throughputPerHour: Number.isFinite(Number(value?.throughputPerHour)) ? Number(value?.throughputPerHour) : 0,
    cartridgeBytes: Number.isFinite(Number(value?.cartridgeBytes)) ? Number(value?.cartridgeBytes) : 0,
    estimatedCompletionAt: value?.estimatedCompletionAt || null,
    pausedAt: value?.pausedAt || null,
    lastControlAt: value?.lastControlAt || null,
    lastError: value?.lastError || null,
  };
}

async function updateWikipediaSearchCatalog(outputDir: string, manifest: WikipediaManifest) {
  const catalogPath = path.join(outputDir, 'wikipedia-catalog.json');
  const release = await acquireCatalogLock(`${catalogPath}.lock`);
  try {
  let catalog: Record<string, string> = {};
  try {
    catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8')) as Record<string, string>;
  } catch {
    for (const file of fs.readdirSync(outputDir).filter((name) => name.endsWith('.manifest.json'))) {
      try {
        const existing = JSON.parse(fs.readFileSync(path.join(outputDir, file), 'utf8')) as WikipediaManifest;
        if (existing.cartridgePath) {
          catalog[path.basename(existing.cartridgePath)] = existing.articles.map((article) => article.title).join(' ');
        }
      } catch {
        // A partially written or legacy manifest is excluded from the query catalog.
      }
    }
  }
  if (manifest.cartridgePath) {
    catalog[path.basename(manifest.cartridgePath)] = manifest.articles.map((article) => article.title).join(' ');
  }
  writeJsonAtomically(catalogPath, catalog);
  try {
    const { error } = await supabaseAdmin.storage.from('cartridges').upload(
      path.basename(catalogPath),
      fs.readFileSync(catalogPath),
      { contentType: 'application/octet-stream', upsert: true },
    );
    if (error) throw error;
  } catch (error) {
    console.warn('[WIKIPEDIA_CATALOG_UPLOAD_FAILED]', error instanceof Error ? error.message : 'unknown error');
  }
  } finally {
    release();
  }
}

async function acquireCatalogLock(lockPath: string) {
  fs.mkdirSync(path.dirname(lockPath), { recursive: true });
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      const descriptor = fs.openSync(lockPath, 'wx');
      fs.closeSync(descriptor);
      return () => { try { fs.unlinkSync(lockPath); } catch { /* another worker recovered it */ } };
    } catch {
      try {
        if (Date.now() - fs.statSync(lockPath).mtimeMs > 60_000) fs.unlinkSync(lockPath);
      } catch { /* lock may disappear between checks */ }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
  throw new Error('Timed out waiting for the Wikipedia catalog write lock.');
}

async function applyRemoteCrawlerControl(state: WikipediaIngestionState, statePath: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) return state;

  try {
    const crawlerId = process.env.PULSE_CRAWLER_ID || `wikipedia-${state.language}`;
    const response = await fetch(
      `${supabaseUrl.replace(/\/$/, '')}/rest/v1/crawler_heartbeats?crawler_id=eq.${encodeURIComponent(crawlerId)}&select=payload`,
      { headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}` }, signal: AbortSignal.timeout(5_000) },
    );
    if (!response.ok) return state;
    const rows = await response.json() as Array<{ payload?: { control?: { action?: string; requestedAt?: string } } }>;
    const control = rows[0]?.payload?.control;
    if (control?.action !== 'resume' || !control.requestedAt || control.requestedAt === state.health.lastControlAt) return state;
    const resumed = {
      ...state,
      updatedAt: new Date().toISOString(),
      health: {
        ...state.health,
        status: 'healthy' as const,
        consecutiveFailureBatches: 0,
        pausedAt: null,
        lastControlAt: control.requestedAt,
        lastError: null,
      },
    };
    saveWikipediaIngestionState(resumed, statePath);
    return resumed;
  } catch {
    return state;
  }
}

export function classifyCrawlFailure(message: string): 'transient' | 'permanent' {
  return /\b(400|401|403|404|410|not found|robots|unsupported|invalid url|blocked domain)\b/i.test(message)
    ? 'permanent'
    : 'transient';
}

function retryBackoffMs(attempts: number) {
  return Math.min(6 * 60 * 60_000, 60_000 * 2 ** Math.max(0, attempts - 1));
}

function cartridgeSizeEstimate(successes: WikipediaCrawlSuccess[]) {
  return successes.reduce((total, success) => total + Buffer.byteLength(success.markdown, 'utf8'), 0);
}

function clampInteger(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, Math.round(value)));
}

function delay(milliseconds: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, milliseconds));
}
