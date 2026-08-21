import { supabaseAdmin } from '@/lib/supabase';
import fs from 'fs';
import path from 'path';
import { clearPulseCartridgeCache } from '@/lib/ai/brain/pulse_query';
import { normalizeRetrievalQuery } from '@/lib/ai/brain/cartridge_ranking';
import { remoteAtlasCacheDir } from '@/lib/ai/brain/atlas_paths';

/**
 * Remote Atlas: Bridges local TAH cartridges with Supabase Cloud Storage.
 * Ensures Vercel deployments can access the Universal Swarm intelligence.
 */
const cartridgeDownloads = new Map<string, Promise<string | null>>();

export const syncRemoteCartridge = async (cartridgeName: string) => {
  if (path.basename(cartridgeName) !== cartridgeName || !/\.(?:tah|hat)$/i.test(cartridgeName)) {
    console.warn('[RemoteAtlas] Ignoring unsafe or unsupported cartridge name.');
    return null;
  }
  const localPath = path.join(process.cwd(), 'cartridges', cartridgeName);
  const tmpPath = path.join(remoteAtlasCacheDir(), cartridgeName);
  
  // If local file exists, we're good (Local Dev or Baked into Build)
  if (fs.existsSync(localPath)) {
    return localPath;
  }
  if (isValidCartridgeFile(tmpPath)) return tmpPath;

  const inFlight = cartridgeDownloads.get(cartridgeName);
  if (inFlight) return inFlight;

  const download = downloadRemoteCartridge(cartridgeName, tmpPath);
  cartridgeDownloads.set(cartridgeName, download);
  try {
    return await download;
  } finally {
    cartridgeDownloads.delete(cartridgeName);
  }
};

async function downloadRemoteCartridge(cartridgeName: string, tmpPath: string) {

  console.log(`[RemoteAtlas] ${cartridgeName} not found locally. Pulling from Supabase...`);

  try {
    const { data, error } = await supabaseAdmin.storage
      .from('cartridges')
      .download(cartridgeName);

    if (error) {
      throw new Error(`Supabase pull failed: ${error.message}`);
    }

    const buffer = Buffer.from(await data.arrayBuffer());
    if (!isValidCartridgeBuffer(buffer)) throw new Error('Downloaded cartridge has an invalid binary header.');
    fs.mkdirSync(path.dirname(tmpPath), { recursive: true });
    const stagingPath = `${tmpPath}.${process.pid}.${Date.now()}.partial`;
    fs.writeFileSync(stagingPath, buffer, { flag: 'wx' });
    fs.renameSync(stagingPath, tmpPath);
    
    return tmpPath;
  } catch (err: unknown) {
    console.error('[RemoteAtlas_ERROR]:', err instanceof Error ? err.message : 'Unknown download failure.');
    return null;
  }
}

/**
 * Syncs the entire 'Universe' of cartridges from Supabase.
 */
export const syncUniversalIntelligence = async (query?: string) => {
  const files = [];
  for (let offset = 0; ; offset += 100) {
    const { data: page, error } = await supabaseAdmin.storage.from('cartridges').list('', { limit: 100, offset });
    if (error || !page?.length) break;
    files.push(...page);
    if (page.length < 100) break;
  }
  if (!files.length) return [];

  const catalog = files.find((candidate) => candidate.name === 'wikipedia-catalog.json');
  const wikipediaNames = query && catalog ? await syncRemoteWikipediaCatalog(query) : new Set<string>();
  const requestedFiles = files.filter((candidate) => /\.(?:tah|hat)$/i.test(candidate.name));
  const selectedFiles = query
    ? requestedFiles.filter((file) => !file.name.startsWith('wiki_') || wikipediaNames.has(file.name))
    : requestedFiles;

  const syncedPaths = [];
  for (let index = 0; index < selectedFiles.length; index += 4) {
    const paths = await Promise.all(selectedFiles.slice(index, index + 4).map((file) => syncRemoteCartridge(file.name)));
    for (const p of paths) if (p) syncedPaths.push(p);
  }
  clearPulseCartridgeCache();
  return syncedPaths;
};

async function syncRemoteWikipediaCatalog(query?: string): Promise<Set<string>> {
  const destination = path.join(remoteAtlasCacheDir(), 'wikipedia-catalog.json');
  try {
    const { data, error } = await supabaseAdmin.storage
      .from('cartridges')
      .download('wikipedia-catalog.json');
    if (error) throw error;
    const buffer = Buffer.from(await data.arrayBuffer());
    const parsed = JSON.parse(buffer.toString('utf8')) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('Wikipedia catalog is not an object.');
    }
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    const stagingPath = `${destination}.${process.pid}.${Date.now()}.partial`;
    fs.writeFileSync(stagingPath, buffer, { flag: 'wx' });
    fs.renameSync(stagingPath, destination);
    return filterWikipediaCatalog(parsed as Record<string, string>, query);
  } catch (error) {
    console.warn('[RemoteAtlas] Wikipedia catalog sync failed:', error instanceof Error ? error.message : 'unknown error');
    try {
      return filterWikipediaCatalog(JSON.parse(fs.readFileSync(destination, 'utf8')) as Record<string, string>, query);
    } catch {
      return new Set();
    }
  }
}

function filterWikipediaCatalog(catalog: Record<string, string>, query?: string) {
  const terms = query ? normalizeRetrievalQuery(query).terms : [];
  return new Set(Object.entries(catalog)
    .filter(([, value]) => !query || terms.some((term) => value.toLowerCase().includes(term)))
    .map(([name]) => name));
}

function isValidCartridgeFile(filePath: string) {
  try {
    const descriptor = fs.openSync(filePath, 'r');
    const header = Buffer.alloc(4);
    fs.readSync(descriptor, header, 0, 4, 0);
    fs.closeSync(descriptor);
    return isValidCartridgeBuffer(header);
  } catch {
    return false;
  }
}

function isValidCartridgeBuffer(buffer: Buffer) {
  if (buffer.length < 4) return false;
  const magic = buffer.readUInt32LE(0);
  return magic === 0x54414821 || magic === 0x48415421;
}
