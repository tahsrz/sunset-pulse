import { supabaseAdmin } from '@/lib/supabase';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { clearPulseCartridgeCache } from '@/lib/ai/brain/pulse_query';

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
  const tmpPath = path.join(os.tmpdir(), cartridgeName);
  
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
export const syncUniversalIntelligence = async () => {
  const { data: files, error } = await supabaseAdmin.storage
    .from('cartridges')
    .list();

  if (error || !files) return [];

  const syncedPaths = [];
  for (const file of files.filter((candidate) => /\.(?:tah|hat)$/i.test(candidate.name))) {
    const p = await syncRemoteCartridge(file.name);
    if (p) syncedPaths.push(p);
  }
  clearPulseCartridgeCache();
  return syncedPaths;
};

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
