import { supabaseAdmin } from '@/lib/supabase';
import fs from 'fs';
import path from 'path';

/**
 * Remote Atlas: Bridges local TAH cartridges with Supabase Cloud Storage.
 * Ensures Vercel deployments can access the Universal Swarm intelligence.
 */
export const syncRemoteCartridge = async (cartridgeName: string) => {
  const localPath = path.join(process.cwd(), 'cartridges', cartridgeName);
  
  // If local file exists, we're good (Local Dev or Baked into Build)
  if (fs.existsSync(localPath)) {
    return localPath;
  }

  console.log(`[RemoteAtlas] ${cartridgeName} not found locally. Pulling from Supabase...`);

  try {
    const { data, error } = await supabaseAdmin.storage
      .from('cartridges')
      .download(cartridgeName);

    if (error) {
      throw new Error(`Supabase pull failed: ${error.message}`);
    }

    // Ensure directory exists
    const dir = path.dirname(localPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    // Write to temporary local storage (Vercel /tmp or similar)
    // Note: Vercel allows writing to /tmp
    const tmpPath = path.join('/tmp', cartridgeName);
    const buffer = Buffer.from(await data.arrayBuffer());
    fs.writeFileSync(tmpPath, buffer);
    
    return tmpPath;
  } catch (err: any) {
    console.error(`[RemoteAtlas_ERROR]:`, err.message);
    return null;
  }
};

/**
 * Syncs the entire 'Universe' of cartridges from Supabase.
 */
export const syncUniversalIntelligence = async () => {
  const { data: files, error } = await supabaseAdmin.storage
    .from('cartridges')
    .list();

  if (error || !files) return [];

  const syncedPaths = [];
  for (const file of files) {
    const p = await syncRemoteCartridge(file.name);
    if (p) syncedPaths.push(p);
  }
  return syncedPaths;
};
