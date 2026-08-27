import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  enqueueWikipediaDemand,
  listWikipediaPages,
  loadWikipediaIngestionState,
  runWikipediaIngestionBatch,
  selectWikipediaDemandMatch,
  type WikipediaPage,
  wikipediaDemandTitleCandidates,
} from '@/lib/wikipedia/crawl4aiWikipedia';
import type { LeadIntelCrawlRecord } from '@/lib/lead-intel/crawlLead';

let tempDir: string;
let statePath: string;
let outputDir: string;
let demandPath: string;

beforeEach(() => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wikipedia-crawl4ai-'));
  statePath = path.join(tempDir, 'ingestion-state.json');
  outputDir = path.join(tempDir, 'cartridges');
  demandPath = path.join(tempDir, 'demand-queue.json');
});

afterEach(() => {
  vi.restoreAllMocks();
  fs.rmSync(tempDir, { recursive: true, force: true });
});

describe('Wikipedia Crawl4AI ingestion', () => {
  it('prefers the canonical topic over an adjacent longer search result', () => {
    expect(selectWikipediaDemandMatch('How does photosynthesis convert light into energy?', [
      { pageid: 2, title: 'Artificial photosynthesis' },
      { pageid: 1, title: 'Photosynthesis' },
      { pageid: 6, title: 'Light' },
      { pageid: 3, title: 'Photosynthetic reaction centre' },
    ])).toEqual({ pageid: 1, title: 'Photosynthesis' });

    expect(selectWikipediaDemandMatch('What caused the French Revolution?', [
      { pageid: 4, title: 'Influence of the American Revolution on the French Revolution' },
      { pageid: 5, title: 'French Revolution' },
    ])).toEqual({ pageid: 5, title: 'French Revolution' });

    expect(wikipediaDemandTitleCandidates('What is the historical importance of Don Quixote?'))
      .toEqual(expect.arrayContaining(['don quixote', 'don', 'quixote']));
    expect(wikipediaDemandTitleCandidates('How does photosynthesis convert light into energy?'))
      .toContain('photosynthesis');
  });

  it('uses bounded demand slots before continuing the alphabetical crawl', async () => {
    enqueueWikipediaDemand([
      { query: 'How does photosynthesis work?', reason: 'retrieval miss' },
      { query: 'How does photosynthesis work?', reason: 'duplicate' },
    ], demandPath);
    const listPages = vi.fn(async ({ limit }: { limit: number }) => ({
      pages: [page(2, 'Alphabetical article')].slice(0, limit),
      continuation: 'Next|3',
    }));
    const result = await runWikipediaIngestionBatch({
      statePath,
      outputDir,
      demandPath,
      batchSize: 2,
      demandSlots: 1,
      requestDelayMs: 0,
      resolveDemandPage: async () => page(1, 'Photosynthesis'),
      listPages,
      crawlPage: async (item) => completedRecord(item),
    });

    expect(result.articleCount).toBe(2);
    expect(listPages).toHaveBeenCalledWith(expect.objectContaining({ limit: 1 }));
    const queue = JSON.parse(fs.readFileSync(demandPath, 'utf8')) as { pending: unknown[]; completed: string[] };
    expect(queue.pending).toHaveLength(0);
    expect(queue.completed).toContain('How does photosynthesis work?');
  });

  it('crawls a bounded MediaWiki batch and forges a resumable TAH cartridge', async () => {
    const pages = [page(1, 'Alpha'), page(2, 'Beta')];
    const result = await runWikipediaIngestionBatch({
      statePath,
      outputDir,
      batchSize: 2,
      requestDelayMs: 0,
      listPages: async () => ({ pages, continuation: 'Gamma|3' }),
      crawlPage: async (item) => completedRecord(item),
    });

    expect(result).toMatchObject({
      status: 'imported',
      articleCount: 2,
      failureCount: 0,
    });
    expect(result.state).toMatchObject({
      continuation: 'Gamma|3',
      enumeratedCount: 2,
      importedCount: 2,
    });

    const cartridge = fs.readFileSync(path.resolve(process.cwd(), result.cartridgePath!));
    expect(cartridge.readUInt32LE(0)).toBe(0x54414821);
    expect(cartridge.readUInt32LE(16)).toBeGreaterThan(0);
    expect(fs.existsSync(path.resolve(process.cwd(), result.manifestPath!))).toBe(true);
  });

  it('replays a written manifest when a crash happens before checkpoint persistence', async () => {
    const pages = [page(7, 'Durable execution')];
    const options = {
      statePath,
      outputDir,
      batchSize: 1,
      requestDelayMs: 0,
      listPages: async () => ({ pages, continuation: 'Next|8' }),
    };
    await runWikipediaIngestionBatch({
      ...options,
      crawlPage: async (item) => completedRecord(item),
    });

    fs.rmSync(statePath);
    const crawlPage = vi.fn(async () => {
      throw new Error('Crawl should not run during replay.');
    });
    const replay = await runWikipediaIngestionBatch({ ...options, crawlPage });

    expect(replay.status).toBe('replayed');
    expect(replay.state.importedCount).toBe(1);
    expect(crawlPage).not.toHaveBeenCalled();
  });

  it('queues transient failures and imports them on a later run', async () => {
    const failedPage = page(11, 'Retryable article');
    await runWikipediaIngestionBatch({
      statePath,
      outputDir,
      batchSize: 1,
      requestDelayMs: 0,
      listPages: async () => ({ pages: [failedPage], continuation: 'Next|12' }),
      crawlPage: async (item) => failedRecord(item),
    });

    expect(loadWikipediaIngestionState({ statePath }).retryQueue).toHaveLength(1);

    const retry = await runWikipediaIngestionBatch({
      statePath,
      outputDir,
      batchSize: 1,
      retrySlots: 1,
      requestDelayMs: 0,
      listPages: async () => ({ pages: [], continuation: 'Next|12' }),
      crawlPage: async (item) => completedRecord(item),
    });

    expect(retry.status).toBe('imported');
    expect(retry.state.retryQueue).toHaveLength(0);
    expect(retry.state.importedCount).toBe(1);
  });

  it('drains queued retries before enumerating fresh Wikipedia pages', async () => {
    const failedPage = page(13, 'Backlog article');
    await runWikipediaIngestionBatch({
      statePath,
      outputDir,
      batchSize: 1,
      requestDelayMs: 0,
      listPages: async () => ({ pages: [failedPage], continuation: 'Fresh|14' }),
      crawlPage: async (item) => failedRecord(item),
    });
    const listPages = vi.fn(async () => ({ pages: [page(14, 'Fresh article')], continuation: 'Next|15' }));
    const afterBackoff = Date.now() + 2 * 60_000;
    vi.spyOn(Date, 'now').mockReturnValue(afterBackoff);

    const result = await runWikipediaIngestionBatch({
      statePath,
      outputDir,
      batchSize: 2,
      requestDelayMs: 0,
      listPages,
      crawlPage: async (item) => completedRecord(item),
    });

    expect(listPages).not.toHaveBeenCalled();
    expect(result.state.importedCount).toBe(1);
    expect(result.state.continuation).toBe('Fresh|14');
  });

  it('aborts without advancing the checkpoint when Crawl4AI is unavailable', async () => {
    const unavailablePage = page(12, 'Unavailable worker');

    await expect(runWikipediaIngestionBatch({
      statePath,
      outputDir,
      batchSize: 1,
      requestDelayMs: 0,
      listPages: async () => ({ pages: [unavailablePage], continuation: 'Next|13' }),
      crawlPage: async (item) => record(item, 'unavailable', ''),
    })).rejects.toThrow('Crawl4AI worker is unavailable');

    expect(fs.existsSync(statePath)).toBe(false);
    expect(fs.existsSync(outputDir)).toBe(false);
  });

  it('pauses after three consecutive zero-success batches', async () => {
    const failedPage = page(15, 'Circuit breaker article');
    const first = await runWikipediaIngestionBatch({
      statePath,
      outputDir,
      batchSize: 1,
      requestDelayMs: 0,
      listPages: async () => ({ pages: [failedPage], continuation: 'Next|16' }),
      crawlPage: async (item) => failedRecord(item),
    });
    const second = await runWikipediaIngestionBatch({
      statePath,
      outputDir,
      batchSize: 1,
      requestDelayMs: 0,
      retrySlots: 1,
      crawlPage: async (item) => failedRecord(item),
    });
    const third = await runWikipediaIngestionBatch({
      statePath,
      outputDir,
      batchSize: 1,
      requestDelayMs: 0,
      retrySlots: 1,
      crawlPage: async (item) => failedRecord(item),
    });

    expect(first.state.health.status).toBe('degraded');
    expect(second.state.health.consecutiveFailureBatches).toBe(2);
    expect(third.status).toBe('paused');
    expect(third.state.health).toMatchObject({ status: 'paused', consecutiveFailureBatches: 3 });
  });

  it('classifies permanent failures out of the retry queue', async () => {
    const missingPage = page(16, 'Missing article');
    const result = await runWikipediaIngestionBatch({
      statePath,
      outputDir,
      batchSize: 1,
      requestDelayMs: 0,
      listPages: async () => ({ pages: [missingPage], continuation: 'Next|17' }),
      crawlPage: async () => { throw new Error('404 not found'); },
    });

    expect(result.state.retryQueue).toHaveLength(0);
    expect(result.state.terminalFailureCount).toBe(1);
  });

  it('backs off transient retries and exposes throughput telemetry', async () => {
    const retryPage = page(17, 'Transient article');
    const result = await runWikipediaIngestionBatch({
      statePath,
      outputDir,
      batchSize: 1,
      requestDelayMs: 0,
      listPages: async () => ({ pages: [retryPage], continuation: 'Next|18' }),
      crawlPage: async (item) => failedRecord(item),
    });

    expect(Date.parse(result.state.retryQueue[0].nextAttemptAt!)).toBeGreaterThan(Date.now());
    expect(result.state.health).toEqual(expect.objectContaining({
      retryBacklogDelta: 1,
      throughputPerHour: expect.any(Number),
      cartridgeBytes: expect.any(Number),
    }));
  });

  it('keeps the corpus complete while retrying a failed final page', async () => {
    const finalPage = page(99, 'Final article');
    await runWikipediaIngestionBatch({
      statePath,
      outputDir,
      batchSize: 1,
      requestDelayMs: 0,
      listPages: async () => ({ pages: [finalPage], continuation: null }),
      crawlPage: async (item) => failedRecord(item),
    });

    const retry = await runWikipediaIngestionBatch({
      statePath,
      outputDir,
      batchSize: 1,
      retrySlots: 1,
      requestDelayMs: 0,
      listPages: async () => {
        throw new Error('Completed enumeration must not restart.');
      },
      crawlPage: async (item) => completedRecord(item),
    });

    expect(retry.state.complete).toBe(true);
    expect(retry.state.retryQueue).toHaveLength(0);
  });

  it('advances an empty filtered MediaWiki window instead of looping on it', async () => {
    const result = await runWikipediaIngestionBatch({
      statePath,
      outputDir,
      batchSize: 1,
      requestDelayMs: 0,
      listPages: async () => ({ pages: [], continuation: '!!' }),
      crawlPage: async (item) => completedRecord(item),
    });

    expect(result.status).toBe('empty');
    expect(result.state.continuation).toBe('!!');
    expect(result.state.complete).toBe(false);
  });

  it('skips empty MediaWiki API windows before returning the next article', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify({
        query: { allpages: [] },
        continue: { apcontinue: '!!' },
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        query: { allpages: [{ pageid: 3632887, title: '!!' }] },
        continue: { apcontinue: '!!!' },
      }), { status: 200 }));

    const result = await listWikipediaPages({
      language: 'en',
      continuation: null,
      limit: 1,
    });

    expect(result).toEqual({
      pages: [{
        pageid: 3632887,
        title: '!!',
        url: 'https://en.wikipedia.org/wiki/!!',
      }],
      continuation: '!!!',
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(new URL(String(fetchMock.mock.calls[1][0])).searchParams.get('apcontinue')).toBe('!!');
  });
});

function page(pageid: number, title: string): WikipediaPage {
  return {
    pageid,
    title,
    url: `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`,
  };
}

function completedRecord(item: WikipediaPage): LeadIntelCrawlRecord {
  return record(item, 'completed', `# ${item.title}\n\nUseful encyclopedia content about ${item.title}.`);
}

function failedRecord(item: WikipediaPage): LeadIntelCrawlRecord {
  return record(item, 'failed', '');
}

function record(
  item: WikipediaPage,
  status: LeadIntelCrawlRecord['status'],
  markdown: string,
): LeadIntelCrawlRecord {
  return {
    id: `crawl_${item.pageid}`,
    createdAt: '2026-08-11T12:00:00.000Z',
    framework: 'crawl4ai',
    status,
    sourceType: 'other',
    extractionMode: 'markdown',
    url: item.url,
    hostname: 'en.wikipedia.org',
    allowedBy: 'request_allowlist',
    entityHints: { source: 'wikipedia' },
    output: {
      markdown: markdown || undefined,
      title: item.title,
      description: null,
      links: [],
      sourceUrl: item.url,
      wordCount: markdown.split(/\s+/).filter(Boolean).length,
    },
    diagnostics: {
      workerPath: 'workers/lead-intel-crawler/crawl4ai_worker.py',
      pythonExecutable: 'python',
      durationMs: 10,
      ledgerPath: 'crawl-results.jsonl',
      note: status === 'failed'
        ? 'Temporary Crawl4AI failure.'
        : status === 'unavailable'
          ? 'Crawl4AI worker is unavailable.'
          : undefined,
    },
  };
}
