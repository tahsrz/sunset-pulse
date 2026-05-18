import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

const scriptDir = path.dirname(new URL(import.meta.url).pathname);
const envPath = path.resolve(process.cwd(), 'SunsetPulse', '.env.local');
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

  const projectRoot = path.resolve(process.cwd(), 'SunsetPulse');
  const cartridgesDir = path.resolve(projectRoot, 'cartridges');
  const universeDir = path.resolve(cartridgesDir, 'universe');
  
  const allFiles = [];
  if (fs.existsSync(cartridgesDir)) allFiles.push(...fs.readdirSync(cartridgesDir).map(f => path.join(cartridgesDir, f)));
  if (fs.existsSync(universeDir)) allFiles.push(...fs.readdirSync(universeDir).map(f => path.join(universeDir, f)));

  const tahFiles = allFiles.filter(f => f.endsWith('.tah') || f.endsWith('.hat'));

  for (const filePath of tahFiles) {
    const fileName = path.basename(filePath);
    const fileBuffer = fs.readFileSync(filePath);

    console.log(`Uploading ${fileName}...`);
    const { error } = await supabase.storage
      .from('cartridges')
      .upload(fileName, fileBuffer, {
        upsert: true,
        contentType: 'application/octet-stream'
      });

    if (error) console.error(`❌ Failed: ${fileName}`, error.message);
    else console.log(`✅ Synced: ${fileName}`);
  }

  console.log('🚀 [Vercel_Supabase_Sync] Complete.');
}

syncToCloud();
