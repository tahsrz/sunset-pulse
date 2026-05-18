import fs from 'fs';
import path from 'path';
import { MemoriaRetriever } from '@/lib/core/memoria_retriever';
import { SwarmRetriever } from '@/lib/core/swarm_retriever';
import { TAHRetriever } from '@/lib/core/tah_retriever';

/**
 * Pulse Search (TypeScript Edition)
 * Optimized for Vercel/Next.js environment.
 * Searches TAH single-file cartridges, split Memoria .hat/.tah cartridges,
 * and raw swarm prototype .tah streams.
 */
export async function pulse_search(query: string, maxResults = 25): Promise<any[]> {
  const cartridgeDirs = getCartridgeDirs();

  const results: any[] = [];
  const processedFiles = new Set<string>();

  for (const dir of cartridgeDirs) {
    if (!fs.existsSync(dir)) continue;

    const files = fs.readdirSync(dir).filter(f => f.endsWith('.tah') || f.endsWith('.hat'));
    
    for (const file of files) {
      const filePath = path.join(dir, file);
      const processedKey = `${dir}:${file}`;
      if (processedFiles.has(processedKey)) continue;
      processedFiles.add(processedKey);

      if (file.endsWith('.hat')) {
        const tahPath = resolveMemoriaTahPath(filePath);
        if (!fs.existsSync(tahPath)) continue;
      }

      if (file.endsWith('.tah') && hasPairedMemoriaHat(filePath)) {
        continue;
      }

      try {
        const matches = searchCartridge(filePath, file, query);
        
        if (matches.length > 0) {
          matches.forEach(m => {
            results.push({
              source: file,
              text: m.data,
              score: m.score
            });
          });
        }
      } catch (err) {
        // console.error(`[PulseSearch] Error in ${file}:`, err);
      }
    }
  }

  return results.sort((a, b) => b.score - a.score).slice(0, maxResults);
}

function searchCartridge(filePath: string, file: string, query: string): Array<{ score: number; data: string }> {
  if (file.endsWith('.hat')) {
    return new MemoriaRetriever(filePath).search(query);
  }

  const magic = readMagic(filePath);
  if (magic === 0x54414821) {
    return new TAHRetriever(filePath).search(query).map(match => ({
      score: 1.0,
      data: match.data
    }));
  }

  return new SwarmRetriever(filePath).search(query).map(match => ({
    score: match.score,
    data: match.data
  }));
}

function getCartridgeDirs(): string[] {
  const configuredDirs = (process.env.PULSE_CARTRIDGE_DIRS || '')
    .split(path.delimiter)
    .map(dir => dir.trim())
    .filter(Boolean);

  return [
    path.join(process.cwd(), 'cartridges'),
    path.resolve(process.cwd(), '..', 'SunsetWars', 'cartridges'),
    ...configuredDirs,
    '/tmp/cartridges', // Synced from Supabase
    '/tmp'
  ];
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
