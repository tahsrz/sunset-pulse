import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as lancedb from '@lancedb/lancedb';

type LanceTahOptions = {
  command: 'index' | 'search';
  query?: string;
  dbPath: string;
  table: string;
  cartridgesDir: string;
  chunkChars: number;
  overlapChars: number;
  limit: number;
};

type TahChunk = {
  id: string;
  source: string;
  sourcePath: string;
  title: string;
  concept: string;
  domain: string;
  trust: string;
  vitality: string;
  chunkIndex: number;
  text: string;
};

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const APP_ROOT = path.resolve(SCRIPT_DIR, '..');
const INVOCATION_CWD = process.cwd();
const DEFAULT_DB_PATH = path.resolve(APP_ROOT, '.lancedb');
const DEFAULT_CARTRIDGES_DIR = path.resolve(APP_ROOT, 'cartridges');
const DEFAULT_TABLE = 'tah_chunks';
const DEFAULT_CHUNK_CHARS = 2400;
const DEFAULT_OVERLAP_CHARS = 240;
const DEFAULT_LIMIT = 8;
const SKIPPED_DIRS = new Set(['expert-atlas', 'master']);

function printUsage() {
  console.log(`Usage:
  npm run tah:lancedb:index
  npm run tah:lancedb:search -- --query "pricing comps"

Options:
  --db <path>              LanceDB directory. Default: apps/pulse/.lancedb
  --table <name>           LanceDB table name. Default: ${DEFAULT_TABLE}
  --cartridges-dir <path>  Cartridge directory. Default: apps/pulse/cartridges
  --chunk-chars <number>   Target chunk size. Default: ${DEFAULT_CHUNK_CHARS}
  --overlap-chars <number> Chunk overlap for continuity. Default: ${DEFAULT_OVERLAP_CHARS}
  --limit <number>         Search result count. Default: ${DEFAULT_LIMIT}
  --query <text>           Search query for tah:lancedb:search`);
}

function parseArgs(command: LanceTahOptions['command'], argv: string[]): LanceTahOptions | null {
  if (argv.includes('--help') || argv.includes('-h')) {
    printUsage();
    return null;
  }

  const options: LanceTahOptions = {
    command,
    dbPath: DEFAULT_DB_PATH,
    table: DEFAULT_TABLE,
    cartridgesDir: DEFAULT_CARTRIDGES_DIR,
    chunkChars: DEFAULT_CHUNK_CHARS,
    overlapChars: DEFAULT_OVERLAP_CHARS,
    limit: DEFAULT_LIMIT,
  };

  applyNpmConfigOptions(options);

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];
    const requireValue = () => {
      if (!next || next.startsWith('--')) throw new Error(`Missing value for ${arg}`);
      index += 1;
      return next;
    };

    switch (arg) {
      case '--db':
        options.dbPath = path.resolve(INVOCATION_CWD, requireValue());
        break;
      case '--table':
        options.table = requireValue();
        break;
      case '--cartridges-dir':
        options.cartridgesDir = path.resolve(INVOCATION_CWD, requireValue());
        break;
      case '--chunk-chars':
        options.chunkChars = parsePositiveInt(requireValue(), '--chunk-chars');
        break;
      case '--overlap-chars':
        options.overlapChars = parsePositiveInt(requireValue(), '--overlap-chars');
        break;
      case '--limit':
        options.limit = parsePositiveInt(requireValue(), '--limit');
        break;
      case '--query':
        options.query = requireValue();
        break;
      default:
        if (!arg.startsWith('--') && command === 'search' && !options.query) {
          options.query = arg;
          break;
        }
        if (!arg.startsWith('--') && command === 'search' && /^\d+$/.test(arg)) {
          options.limit = parsePositiveInt(arg, '--limit');
          break;
        }
        if (!arg.startsWith('--')) break;
        throw new Error(`Unknown option: ${arg}`);
    }
  }

  if (options.overlapChars >= options.chunkChars) {
    throw new Error('--overlap-chars must be smaller than --chunk-chars');
  }

  return options;
}

async function indexTah(options: LanceTahOptions) {
  if (!fs.existsSync(options.cartridgesDir)) {
    throw new Error(`Cartridge directory does not exist: ${options.cartridgesDir}`);
  }

  const files = listTahFiles(options.cartridgesDir);
  const chunks = files.flatMap((filePath) => chunksForFile(filePath, options));

  if (chunks.length === 0) {
    throw new Error(`No .tah chunks found under ${options.cartridgesDir}`);
  }

  fs.mkdirSync(options.dbPath, { recursive: true });
  const db = await lancedb.connect(options.dbPath);
  const table = await db.createTable(options.table, chunks, { mode: 'overwrite' });
  await table.createIndex('text', {
    config: lancedb.Index.fts({
      withPosition: true,
      stem: true,
      removeStopWords: true,
    }),
    replace: true,
    waitTimeoutSeconds: 120,
  });

  const indices = await table.listIndices();
  return {
    dbPath: options.dbPath,
    table: options.table,
    files: files.length,
    chunks: chunks.length,
    indices: indices.map((index) => index.name),
  };
}

async function searchTah(options: LanceTahOptions) {
  if (!options.query) {
    throw new Error('Search requires --query "text"');
  }

  const db = await lancedb.connect(options.dbPath);
  const table = await db.openTable(options.table);
  const rows = await table
    .search(options.query)
    .select(['source', 'title', 'concept', 'domain', 'chunkIndex', 'text', '_score'])
    .limit(options.limit)
    .toArray();

  return rows.map((row, index) => ({
    rank: index + 1,
    score: typeof row._score === 'number' ? Number(row._score.toFixed(4)) : null,
    source: row.source,
    title: row.title,
    concept: row.concept,
    domain: row.domain,
    chunkIndex: row.chunkIndex,
    preview: compact(String(row.text || ''), 420),
  }));
}

function listTahFiles(root: string) {
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (SKIPPED_DIRS.has(entry.name)) continue;
        walk(path.join(dir, entry.name));
        continue;
      }
      if (entry.isFile() && entry.name.endsWith('.tah')) {
        files.push(path.join(dir, entry.name));
      }
    }
  };
  walk(root);
  return files.sort((a, b) => a.localeCompare(b));
}

function chunksForFile(filePath: string, options: LanceTahOptions): TahChunk[] {
  const raw = fs.readFileSync(filePath, 'utf8').replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
  if (!raw) return [];

  const meta = parseTahHeader(raw);
  const source = path.basename(filePath);
  const textChunks = chunkText(raw, options.chunkChars, options.overlapChars);

  return textChunks.map((text, chunkIndex) => ({
    id: `${source}#${chunkIndex}`,
    source,
    sourcePath: filePath,
    title: meta.title || titleFromFile(source),
    concept: meta.concept || slugify(source.replace(/\.tah$/i, '')),
    domain: meta.domain || 'tah_cartridge',
    trust: meta.trust || 'local',
    vitality: meta.vitality || 'unknown',
    chunkIndex,
    text,
  }));
}

function parseTahHeader(text: string) {
  const meta: Record<string, string> = {};
  for (const line of text.split('\n').slice(0, 40)) {
    const match = line.match(/^([A-Z_]+):\s*(.+)$/);
    if (!match) continue;
    meta[match[1].toLowerCase()] = match[2].trim();
  }
  return {
    title: meta.title,
    concept: meta.concept,
    domain: meta.domain,
    trust: meta.trust,
    vitality: meta.vitality,
  };
}

function chunkText(text: string, chunkChars: number, overlapChars: number) {
  const paragraphs = text.split(/\n{2,}/);
  const chunks: string[] = [];
  let current = '';

  for (const paragraph of paragraphs) {
    const next = current ? `${current}\n\n${paragraph}` : paragraph;
    if (next.length <= chunkChars) {
      current = next;
      continue;
    }

    if (current) chunks.push(current);

    if (paragraph.length > chunkChars) {
      chunks.push(...chunkLongParagraph(paragraph, chunkChars, overlapChars));
      current = '';
    } else {
      current = overlapTail(current, overlapChars);
      current = current ? `${current}\n\n${paragraph}` : paragraph;
    }
  }

  if (current) chunks.push(current);
  return chunks.filter(Boolean);
}

function chunkLongParagraph(text: string, chunkChars: number, overlapChars: number) {
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(text.length, start + chunkChars);
    chunks.push(text.slice(start, end).trim());
    if (end === text.length) break;
    start = Math.max(0, end - overlapChars);
  }
  return chunks;
}

function overlapTail(text: string, overlapChars: number) {
  if (!text || overlapChars <= 0) return '';
  return text.slice(Math.max(0, text.length - overlapChars)).trim();
}

function applyNpmConfigOptions(options: LanceTahOptions) {
  const getConfig = (name: string) => process.env[`npm_config_${name.replace(/-/g, '_')}`];
  const dbPath = getConfig('db');
  const table = getConfig('table');
  const cartridgesDir = getConfig('cartridges-dir');
  const chunkChars = getConfig('chunk-chars');
  const overlapChars = getConfig('overlap-chars');
  const limit = getConfig('limit');
  const query = getConfig('query');

  if (dbPath && dbPath !== 'true') options.dbPath = path.resolve(INVOCATION_CWD, dbPath);
  if (table && table !== 'true') options.table = table;
  if (cartridgesDir && cartridgesDir !== 'true') options.cartridgesDir = path.resolve(INVOCATION_CWD, cartridgesDir);
  if (chunkChars && chunkChars !== 'true') options.chunkChars = parsePositiveInt(chunkChars, '--chunk-chars');
  if (overlapChars && overlapChars !== 'true') options.overlapChars = parsePositiveInt(overlapChars, '--overlap-chars');
  if (limit && limit !== 'true') options.limit = parsePositiveInt(limit, '--limit');
  if (query && query !== 'true') options.query = query;
}

function parsePositiveInt(value: string, label: string) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) {
    throw new Error(`${label} must be a positive number`);
  }
  return Math.floor(parsed);
}

function titleFromFile(fileName: string) {
  return fileName
    .replace(/\.tah$/i, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '') || 'tah_cartridge';
}

function compact(value: string, maxLength: number) {
  const compacted = value.replace(/\s+/g, ' ').trim();
  return compacted.length <= maxLength ? compacted : `${compacted.slice(0, maxLength - 3).trimEnd()}...`;
}

async function main() {
  const scriptName = path.basename(process.argv[1] || '');
  const command = scriptName.includes('search') ? 'search' : 'index';
  const options = parseArgs(command, process.argv.slice(2));
  if (!options) return;

  if (command === 'index') {
    const result = await indexTah(options);
    console.log(`LanceDB TAH index ready: ${result.dbPath}`);
    console.log(`Table: ${result.table}`);
    console.log(`Files indexed: ${result.files}`);
    console.log(`Chunks indexed: ${result.chunks}`);
    console.log(`Indices: ${result.indices.join(', ') || 'none'}`);
    return;
  }

  const results = await searchTah(options);
  console.log(JSON.stringify({ query: options.query, results }, null, 2));
}

main().catch((error) => {
  console.error(`LanceDB TAH command failed: ${(error as Error).message}`);
  process.exit(1);
});

export { chunkText, indexTah, listTahFiles, parseArgs, searchTah };
