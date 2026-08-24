import fs from 'fs';
import path from 'path';
import { MemoriaRetriever } from '@/lib/core/memoria_retriever';
import { SwarmRetriever } from '@/lib/core/swarm_retriever';
import { TAHRetriever } from '@/lib/core/tah_retriever';
import { getCartridgeSearchQuery } from '@/lib/ai/brain/cartridge_query';
import { classifyCartridgeDomain, resolvePairedTahPath, summarizePayload } from '@/lib/ai/brain/cartridge_metadata';
import {
  normalizeRetrievalQuery,
  rankCartridgeDocuments,
  scoreRetrievedEvidence,
  type CartridgeRankingDocument,
} from '@/lib/ai/brain/cartridge_ranking';
import { remoteAtlasCacheDir } from '@/lib/ai/brain/atlas_paths';

export type PulseCartridge = {
  name: string;
  path: string;
  slug: string;
  title: string;
  type: 'hat' | 'tah';
  searchTerms?: string;
};

export type PulseSearchTrace = {
  query: string;
  startedAt: string;
  durationMs: number;
  candidateCount: number;
  searchLimit: number;
  searchedCartridges: string[];
  matchedCartridges: string[];
  resultCount: number;
  stopReason: 'complete' | 'time_budget' | 'search_limit';
  remoteHydration: 'not_needed' | 'completed' | 'empty';
  candidateDecisions: Array<{ source: string; score: number; selected: boolean; reasons: string[] }>;
};

let cachedCartridges: PulseCartridge[] | null = null;
let cachedKey: string | null = null;
let cachedAt = 0;
const remoteHydrations = new Map<string, { promise: Promise<string[]>; expiresAt: number }>();
let wikipediaSearchCatalog: Record<string, string> | null = null;
const rankingDocumentCache = new Map<string, CartridgeRankingDocument>();

export function clearPulseCartridgeCache() {
  cachedCartridges = null;
  cachedKey = null;
  cachedAt = 0;
  wikipediaSearchCatalog = null;
  rankingDocumentCache.clear();
}

export function clearPulseRemoteHydrationCacheForTests() {
  remoteHydrations.clear();
}

export function listPulseCartridges(): PulseCartridge[] {
  if (cachedCartridges && Date.now() - cachedAt < 30_000) return cachedCartridges;
  const dirs = getCartridgeDirs();
  const rawFilesInfo = dirs.map((dir) => {
    try { return `${dir}:${fs.statSync(dir).mtimeMs}`; } catch { return `${dir}:0`; }
  });

  const currentKey = rawFilesInfo.join('|');
  if (cachedCartridges && cachedKey === currentKey) {
    return cachedCartridges;
  }

  const rawCartridges: PulseCartridge[] = [];
  const seen = new Set<string>();

  for (const dir of dirs) {
    const files = readCartridgeFiles(dir);
    for (const file of files) {
      const filePath = path.join(dir, file);
      if (seen.has(filePath)) continue;
      seen.add(filePath);

      if (file.endsWith('.hat') && !fs.existsSync(resolveMemoriaTahPath(filePath))) {
        continue;
      }

      if (file.endsWith('.tah') && hasPairedMemoriaHat(filePath)) {
        continue;
      }

      const slug = cartridgeSlug(file);

      rawCartridges.push({
        name: file,
        path: filePath,
        slug,
        title: cartridgeTitle(file),
        type: file.endsWith('.hat') ? 'hat' : 'tah',
        searchTerms: readManifestSearchTerms(filePath),
      });
    }
  }

  const uniqueGroups = new Map<string, PulseCartridge>();
  for (const cartridge of rawCartridges) {
    const searchQuery = getCartridgeSearchQuery(cartridge);
    const existing = uniqueGroups.get(searchQuery);
    if (!existing || safeMtime(cartridge.path) > safeMtime(existing.path)) {
      uniqueGroups.set(searchQuery, cartridge);
    }
  }
  const consolidated = Array.from(uniqueGroups.values()).sort((a, b) => a.name.localeCompare(b.name));
  
  cachedCartridges = consolidated;
  cachedKey = currentKey;
  cachedAt = Date.now();

  return consolidated;
}

function safeMtime(filePath: string) {
  try { return fs.statSync(filePath).mtimeMs; } catch { return 0; }
}

export function getPulseCartridge(slug: string): PulseCartridge | null {
  return listPulseCartridges().find(cartridge => cartridge.slug === slug) || null;
}

/**
 * Pulse Search (TypeScript Edition)
 * Optimized for Vercel/Next.js environment.
 * Searches TAH single-file cartridges, split Memoria .hat/.tah cartridges,
 * and raw swarm prototype .tah streams.
 */
export async function pulse_search(query: string, maxResults = 25): Promise<any[]> {
  return (await runPulseSearch(query, maxResults)).results;
}

export async function pulse_search_with_trace(query: string, maxResults = 25) {
  return runPulseSearch(query, maxResults);
}

async function runPulseSearch(query: string, maxResults: number): Promise<{ results: any[]; trace: PulseSearchTrace }> {
  const started = Date.now();
  let hydration: PulseSearchTrace['remoteHydration'] = 'not_needed';
  const isBuild = process.env.NEXT_PHASE === 'phase-production-build';
  if (process.env.VERCEL && !isBuild) {
    const hydrationKey = remoteHydrationKey(query);
    let hydrationEntry = remoteHydrations.get(hydrationKey);
    if (hydrationEntry && hydrationEntry.expiresAt <= Date.now()) {
      remoteHydrations.delete(hydrationKey);
      hydrationEntry = undefined;
    }
    if (!hydrationEntry) {
      const promise = import('@/lib/ai/brain/remote_atlas')
        .then(({ syncUniversalIntelligence }) => syncUniversalIntelligence(query))
        .then((paths) => {
          if (!paths.length) throw new Error('Remote Atlas returned no usable cartridges.');
          return paths;
        })
        .catch((error) => {
          remoteHydrations.delete(hydrationKey);
          console.warn('[PulseSearch] Remote Atlas hydration failed:', error instanceof Error ? error.message : 'unknown error');
          return [];
        });
      hydrationEntry = { promise, expiresAt: Date.now() + remoteHydrationTtlMs() };
      remoteHydrations.set(hydrationKey, hydrationEntry);
      trimRemoteHydrationCache();
    }
    const hydrated = await hydrationEntry.promise;
    hydration = hydrated.length ? 'completed' : 'empty';
  }
  const rankedCandidates = rankCartridgesForQuery(
    uniqueCartridges([...wikipediaCandidates(query), ...listPulseCartridges()]),
    query,
  );
  const limit = searchCartridgeLimit();
  const eligibleCandidates = rankedCandidates.filter((candidate) => candidate.score > 0);
  const candidates = eligibleCandidates.slice(0, limit);
  const results: any[] = [];
  const searchedCartridges: string[] = [];
  const matchedCartridges = new Set<string>();
  const deadline = Date.now() + searchTimeBudgetMs();
  let timeBudgetReached = false;

  for (const candidate of candidates) {
    const cartridge = candidate.cartridge;
    if (Date.now() > deadline && results.length > 0) {
      timeBudgetReached = true;
      break;
    }
    searchedCartridges.push(cartridge.name);
    try {
      const matches = searchCartridge(cartridge.path, cartridge.name, query, candidate.score);
      
      if (matches.length > 0) {
        matchedCartridges.add(cartridge.name);
        matches.forEach(m => {
          results.push({
            source: cartridge.name,
            text: m.data,
            score: m.score,
            links: m.links || []
          });
        });
      }
    } catch (err) {
      // console.error(`[PulseSearch] Error in ${cartridge.name}:`, err);
    }
  }

  const selected = results.sort((a, b) => b.score - a.score).slice(0, maxResults);
  return {
    results: selected,
    trace: {
      query,
      startedAt: new Date(started).toISOString(),
      durationMs: Date.now() - started,
      candidateCount: rankedCandidates.length,
      searchLimit: limit,
      searchedCartridges,
      matchedCartridges: [...matchedCartridges],
      resultCount: selected.length,
      stopReason: timeBudgetReached ? 'time_budget' : eligibleCandidates.length > limit ? 'search_limit' : 'complete',
      remoteHydration: hydration,
      candidateDecisions: rankedCandidates.slice(0, 30).map((candidate) => ({
        source: candidate.cartridge.name,
        score: candidate.score,
        selected: candidates.includes(candidate),
        reasons: candidate.reasons,
      })),
    },
  };
}

function rankCartridgesForQuery(cartridges: PulseCartridge[], query: string) {
  return rankCartridgeDocuments(cartridges.map(rankingDocumentFor), query);
}

function rankingDocumentFor(cartridge: PulseCartridge): CartridgeRankingDocument {
  let statKey = cartridge.path;
  try {
    const stat = fs.statSync(cartridge.path);
    statKey = `${cartridge.path}:${stat.size}:${stat.mtimeMs}:${cartridge.searchTerms || ''}`;
  } catch {
    // Missing files receive only filename/catalog metadata.
  }
  const cached = rankingDocumentCache.get(statKey);
  if (cached) return cached;
  const searchQuery = getCartridgeSearchQuery(cartridge);
  const magic = readMagic(cartridge.path);
  const format = cartridge.type === 'hat' ? 'memoria-pair' : magic === 0x54414821 ? 'indexed-tah' : 'swarm-stream';
  const payloadPath = cartridge.type === 'hat' ? resolvePairedTahPath(cartridge.path) : cartridge.path;
  const representativeText = summarizePayload(payloadPath, searchQuery, format);
  const domain = classifyCartridgeDomain(cartridge, searchQuery, representativeText).label;
  const document = {
    cartridge,
    title: `${cartridge.title} ${cartridge.name} ${searchQuery}`,
    searchTerms: cartridge.searchTerms || '',
    representativeText,
    domain,
  };
  rankingDocumentCache.set(statKey, document);
  return document;
}

function wikipediaCandidates(query: string): PulseCartridge[] {
  // Keep catalog preselection aligned with ranking: raw question words such as
  // "the" and "are" otherwise crowd out the domain terms that identify a page.
  const terms = normalizeRetrievalQuery(query).terms;
  const directories = [path.join(process.cwd(), 'cartridges', 'wikipedia'), remoteAtlasCacheDir()];
  return directories.flatMap((directory) => Object.entries(loadWikipediaSearchCatalog(directory))
    .map(([name, searchTerms]) => ({
      name,
      searchTerms,
      directory,
      score: terms.reduce((total, term) => total + (searchTerms.toLowerCase().includes(term) ? 1 : 0), 0),
    }))
    .filter((item) => item.score > 0 && fs.existsSync(path.join(directory, item.name)))
  )
    .sort((left, right) => right.score - left.score)
    .slice(0, 40)
    .map(({ name, searchTerms, directory }) => ({
      name,
      path: path.join(directory, name),
      slug: cartridgeSlug(name),
      title: cartridgeTitle(name),
      type: 'tah' as const,
      searchTerms,
    }));
}

function uniqueCartridges(cartridges: PulseCartridge[]) {
  return [...new Map(cartridges.map((cartridge) => [cartridge.path, cartridge])).values()];
}

function readManifestSearchTerms(cartridgePath: string) {
  if (!cartridgePath.toLowerCase().includes(`${path.sep}wikipedia${path.sep}`)) return '';
  wikipediaSearchCatalog ||= loadWikipediaSearchCatalog(path.dirname(cartridgePath));
  return wikipediaSearchCatalog[path.basename(cartridgePath)] || '';
}

function loadWikipediaSearchCatalog(directory: string) {
  try {
    return JSON.parse(fs.readFileSync(path.join(directory, 'wikipedia-catalog.json'), 'utf8')) as Record<string, string>;
  } catch {
    return {};
  }
}

function searchCartridgeLimit() {
  const configured = Number(process.env.PULSE_SEARCH_CARTRIDGE_LIMIT);
  return Number.isInteger(configured) && configured > 0 ? Math.min(configured, 100) : 18;
}

function searchTimeBudgetMs() {
  const configured = Number(process.env.PULSE_SEARCH_TIME_BUDGET_MS);
  return Number.isFinite(configured) && configured >= 100 ? Math.min(configured, 10_000) : 1_500;
}

export async function previewPulseCartridge(slug: string, maxResults = 5): Promise<any[]> {
  const cartridge = getPulseCartridge(slug);
  if (!cartridge) return [];

  const query = getCartridgeSearchQuery(cartridge).replace(/[^a-z0-9 .+#-]/gi, ' ').trim() || cartridge.name;
  const results = await pulse_search(query, 100);
  return results
    .filter(result => result.source === cartridge.name)
    .slice(0, maxResults);
}

function cartridgeSlug(file: string): string {
  return file
    .replace(/\.tah\.hat$/, '')
    .replace(/\.tah\.tah$/, '')
    .replace(/\.(hat|tah)$/, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function cartridgeTitle(file: string): string {
  return file
    .replace(/\.tah\.hat$/, '')
    .replace(/\.tah\.tah$/, '')
    .replace(/\.(hat|tah)$/, '')
    .split(/[_\-\s]+/)
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function searchCartridge(filePath: string, file: string, query: string, candidateScore: number): Array<{ score: number; data: string; links?: number[] }> {
  if (file.endsWith('.hat')) {
    return new MemoriaRetriever(filePath).search(query)
      .map((match) => ({ ...match, score: scoreRetrievedEvidence(query, match.data, candidateScore, match.score) }))
      .filter((match) => match.score > 0);
  }

  const magic = readMagic(filePath);
  if (magic === 0x54414821) {
    const retriever = new TAHRetriever(filePath);
    const matches = uniqueTahMatches([
      query,
      ...normalizeRetrievalQuery(query).terms,
    ].flatMap((term) => retriever.search(term)));
    return matches.map(match => ({
      score: scoreRetrievedEvidence(query, match.data, candidateScore, 1),
      data: match.data,
      links: []
    })).filter((match) => match.score > 0);
  }

  return new SwarmRetriever(filePath).search(query).map(match => ({
    score: scoreRetrievedEvidence(query, match.data, candidateScore, match.score),
    data: match.data,
    links: []
  })).filter((match) => match.score > 0);
}

function uniqueTahMatches<T extends { offset: bigint; length: number }>(matches: T[]) {
  const seen = new Set<string>();
  return matches.filter((match) => {
    const key = `${match.offset}:${match.length}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function getCartridgeDirs(): string[] {
  const configuredDirs = (process.env.PULSE_CARTRIDGE_DIRS || '')
    .split(path.delimiter)
    .map(dir => dir.trim())
    .filter(Boolean);

  const roots = [
    path.join(process.cwd(), 'cartridges'),
    path.resolve(process.cwd(), '..', 'SunsetWars', 'cartridges'),
    path.resolve(process.cwd(), '..', '..', '..', 'SunsetWars', 'cartridges'),
    ...configuredDirs,
    remoteAtlasCacheDir(),
  ];

  const dirs = new Set<string>();
  for (const root of roots) {
    for (const dir of collectCartridgeDirs(root)) {
      dirs.add(dir);
    }
  }

  return [...dirs];
}

function remoteHydrationKey(query: string) {
  return normalizeRetrievalQuery(query).terms.slice(0, 8).join('|') || '__general__';
}

function remoteHydrationTtlMs() {
  const configured = Number(process.env.PULSE_REMOTE_HYDRATION_TTL_MS);
  return Number.isFinite(configured) && configured >= 5_000
    ? Math.min(configured, 10 * 60_000)
    : 60_000;
}

function trimRemoteHydrationCache() {
  while (remoteHydrations.size > 32) {
    const oldestKey = remoteHydrations.keys().next().value;
    if (!oldestKey) break;
    remoteHydrations.delete(oldestKey);
  }
}

function collectCartridgeDirs(root: string, depth = 3): string[] {
  if (!fs.existsSync(root)) return [];

  if (depth <= 0) return [root];

  try {
    const entries = fs.readdirSync(root, { withFileTypes: true });
    const dirs = [root];

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      dirs.push(...collectCartridgeDirs(path.join(root, entry.name), depth - 1));
    }

    return dirs;
  } catch {
    return [];
  }
}

function readCartridgeFiles(dir: string): string[] {
  try {
    if (!fs.existsSync(dir)) return [];
    const files = fs.readdirSync(dir).filter(file => file.endsWith('.tah') || file.endsWith('.hat'));
    return path.basename(dir).toLowerCase() === 'wikipedia' ? files.slice(-25) : files;
  } catch {
    return [];
  }
}

function readMagic(filePath: string): number | null {
  try {
    const fd = fs.openSync(filePath, 'r');
    const header = Buffer.alloc(4);
    fs.readSync(fd, header, 0, 4, 0);
    fs.closeSync(fd);
    return header.readUInt32LE(0);
  } catch {
    return null;
  }
}

function resolveMemoriaTahPath(hatPath: string): string {
  if (hatPath.endsWith('.tah.hat')) {
    return `${hatPath.slice(0, -8)}.tah.tah`;
  }

  return path.join(path.dirname(hatPath), `${path.basename(hatPath, '.hat')}.tah`);
}

function hasPairedMemoriaHat(tahPath: string): boolean {
  if (tahPath.endsWith('.tah.tah')) {
    return fs.existsSync(`${tahPath.slice(0, -8)}.tah.hat`);
  }

  return fs.existsSync(path.join(path.dirname(tahPath), `${path.basename(tahPath, '.tah')}.hat`));
}
