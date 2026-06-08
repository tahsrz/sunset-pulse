import fs from 'fs';
import path from 'path';
import { MemoriaRetriever } from '@/lib/core/memoria_retriever';
import { SwarmRetriever } from '@/lib/core/swarm_retriever';
import { TAHRetriever } from '@/lib/core/tah_retriever';
import { getCartridgeSearchQuery } from '@/lib/ai/brain/cartridge_query';

export type PulseCartridge = {
  name: string;
  path: string;
  slug: string;
  title: string;
  type: 'hat' | 'tah';
};

let cachedCartridges: PulseCartridge[] | null = null;
let cachedKey: string | null = null;

export function listPulseCartridges(): PulseCartridge[] {
  const dirs = getCartridgeDirs();
  const rawFilesInfo: string[] = [];

  for (const dir of dirs) {
    const files = readCartridgeFiles(dir);
    for (const file of files) {
      const filePath = path.join(dir, file);
      try {
        const stat = fs.statSync(filePath);
        rawFilesInfo.push(`${filePath}:${stat.size}:${stat.mtimeMs}`);
      } catch {
        rawFilesInfo.push(`${filePath}:0:0`);
      }
    }
  }

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
        type: file.endsWith('.hat') ? 'hat' : 'tah'
      });
    }
  }

  // Group by Search Query to consolidate duplicates (keeping the latest scrape)
  const uniqueGroups = new Map<string, PulseCartridge>();

  for (const cartridge of rawCartridges) {
    const searchQuery = getCartridgeSearchQuery(cartridge);
    const existing = uniqueGroups.get(searchQuery);
    if (!existing) {
      uniqueGroups.set(searchQuery, cartridge);
    } else {
      const existingMatch = existing.name.match(/\d+/);
      const currentMatch = cartridge.name.match(/\d+/);
      const existingTime = existingMatch ? Number(existingMatch[0]) : 0;
      const currentTime = currentMatch ? Number(currentMatch[0]) : 0;

      if (currentTime > existingTime) {
        uniqueGroups.set(searchQuery, cartridge);
      }
    }
  }

  const consolidated = Array.from(uniqueGroups.values()).sort((a, b) => a.name.localeCompare(b.name));
  
  cachedCartridges = consolidated;
  cachedKey = currentKey;

  return consolidated;
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
  const cartridges = listPulseCartridges();
  const results: any[] = [];

  for (const cartridge of cartridges) {
    try {
      const matches = searchCartridge(cartridge.path, cartridge.name, query);
      
      if (matches.length > 0) {
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

  return results.sort((a, b) => b.score - a.score).slice(0, maxResults);
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

function searchCartridge(filePath: string, file: string, query: string): Array<{ score: number; data: string; links?: number[] }> {
  if (file.endsWith('.hat')) {
    return new MemoriaRetriever(filePath).search(query);
  }

  const magic = readMagic(filePath);
  if (magic === 0x54414821) {
    return new TAHRetriever(filePath).search(query).map(match => ({
      score: 1.0,
      data: match.data,
      links: []
    }));
  }

  return new SwarmRetriever(filePath).search(query).map(match => ({
    score: match.score,
    data: match.data,
    links: []
  }));
}

function getCartridgeDirs(): string[] {
  const configuredDirs = (process.env.PULSE_CARTRIDGE_DIRS || '')
    .split(path.delimiter)
    .map(dir => dir.trim())
    .filter(Boolean);

  const roots = [
    path.join(process.cwd(), 'cartridges'),
    path.resolve(process.cwd(), '..', 'SunsetWars', 'cartridges'),
    ...configuredDirs,
    '/tmp/cartridges', // Synced from Supabase
    '/tmp'
  ];

  const dirs = new Set<string>();
  for (const root of roots) {
    for (const dir of collectCartridgeDirs(root)) {
      dirs.add(dir);
    }
  }

  return [...dirs];
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
    return fs.readdirSync(dir).filter(file => file.endsWith('.tah') || file.endsWith('.hat'));
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
