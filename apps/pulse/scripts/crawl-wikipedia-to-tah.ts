import './load-env';

import {
  runWikipediaIngestionBatch,
  type WikipediaBatchResult,
} from '../lib/wikipedia/crawl4aiWikipedia';

type CliOptions = {
  continuous: boolean;
  language?: string;
  batchSize?: number;
  idleMs: number;
};

async function main() {
  const options = parseArgs(process.argv.slice(2));
  let consecutiveFailures = 0;

  do {
    try {
      const result = await runWikipediaIngestionBatch({
        language: options.language,
        batchSize: options.batchSize,
      });
      printResult(result);
      consecutiveFailures = 0;

      if (!options.continuous || result.status === 'complete') return;
      await delay(options.idleMs);
    } catch (error) {
      if (!options.continuous) throw error;

      consecutiveFailures += 1;
      const retryMs = Math.min(
        Math.max(options.idleMs, 5_000) * (2 ** Math.min(consecutiveFailures - 1, 5)),
        5 * 60_000,
      );
      console.error(
        `[WIKIPEDIA_CRAWL4AI_BATCH_RETRY] retrying in ${retryMs}ms`,
        error,
      );
      await delay(retryMs);
    }
  } while (true);
}

function parseArgs(args: string[]): CliOptions {
  const options: CliOptions = {
    continuous: false,
    idleMs: 30_000,
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    const nextValue = () => {
      const value = args[index + 1];
      if (!value || value.startsWith('--')) throw new Error(`Missing value for ${arg}.`);
      index += 1;
      return value;
    };

    if (arg === '--continuous') options.continuous = true;
    else if (arg === '--language') options.language = nextValue();
    else if (arg === '--batch-size') options.batchSize = positiveInteger(nextValue(), arg);
    else if (arg === '--idle-ms') options.idleMs = positiveInteger(nextValue(), arg);
    else if (arg === '--help' || arg === '-h') {
      printUsage();
      process.exit(0);
    } else {
      throw new Error(`Unknown option: ${arg}`);
    }
  }

  return options;
}

function positiveInteger(value: string, name: string) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) throw new Error(`${name} requires a positive integer.`);
  return parsed;
}

function printResult(result: WikipediaBatchResult) {
  console.log(JSON.stringify({
    status: result.status,
    batchId: result.batchId,
    cartridgePath: result.cartridgePath,
    manifestPath: result.manifestPath,
    articleCount: result.articleCount,
    failureCount: result.failureCount,
    progress: {
      continuation: result.state.continuation,
      complete: result.state.complete,
      enumerated: result.state.enumeratedCount,
      imported: result.state.importedCount,
      queuedRetries: result.state.retryQueue.length,
      terminalFailures: result.state.terminalFailureCount,
    },
  }, null, 2));
}

function printUsage() {
  console.log(`Usage: npm run wikipedia:crawl -- [options]

Options:
  --continuous          Keep processing bounded batches until Wikipedia is exhausted.
  --language <code>     Wikipedia language subdomain. Default: en.
  --batch-size <count>  Articles per batch. Default: 10, maximum: 50.
  --idle-ms <ms>        Delay between continuous batches. Default: 30000.
  --help                Show this help.`);
}

function delay(milliseconds: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, milliseconds));
}

main().catch((error) => {
  console.error('[WIKIPEDIA_CRAWL4AI_INGESTION_FAILED]', error);
  process.exitCode = 1;
});
