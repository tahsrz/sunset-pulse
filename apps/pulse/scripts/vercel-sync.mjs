import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { inspectProjectStorage, publishBackgroundCartridge } from '../lib/storage/projectStorageMaintenance.mjs';
import { fileURLToPath } from 'node:url';

const appRoot = fileURLToPath(new URL('../', import.meta.url));
const envPath = path.join(appRoot, '.env.local');
dotenv.config({ path: envPath });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials for sync.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function syncToCloud() {
  console.log('🌌 [Vercel_Supabase_Sync] Pushing Universal Swarm to Cloud Storage...');

  const maintenance = await inspectProjectStorage(supabase);
  if (!maintenance.backgroundUploadsAllowed) {
    console.log(`Cloud sync paused: ${maintenance.reasons.join(', ')}.`);
    return;
  }
  const cartridgesDir = path.join(appRoot, 'cartridges');
  const universeDir = path.resolve(cartridgesDir, 'universe');
  
  const allFiles = [];
  if (fs.existsSync(cartridgesDir)) allFiles.push(...fs.readdirSync(cartridgesDir).map(f => path.join(cartridgesDir, f)));
  if (fs.existsSync(universeDir)) allFiles.push(...fs.readdirSync(universeDir).map(f => path.join(universeDir, f)));

  const tahFiles = allFiles.filter(f => f.endsWith('.tah') || f.endsWith('.hat'));

  for (const filePath of tahFiles) {
    const fileName = path.basename(filePath);
    console.log(`Uploading ${fileName}...`);
    const result = await publishBackgroundCartridge(supabase, fileName, () => fs.readFileSync(filePath));
    console.log(`${fileName}: ${result.state}${result.error ? ` (${result.error.message})` : ''}`);
    if (result.state === 'paused') break;
  }

  console.log('🚀 [Vercel_Supabase_Sync] Complete.');
}

syncToCloud().catch(() => { console.error('Cloud sync failed.'); process.exitCode = 1; });
