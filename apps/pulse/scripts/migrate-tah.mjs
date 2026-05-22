import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Requires service role for bucket creation

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function migrateCartridges() {
  console.log('🚀 Starting TAH Cartridge Migration to Supabase...');

  // 1. Ensure 'cartridges' bucket exists
  const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
  if (bucketError) {
    console.error('Error listing buckets:', bucketError);
    return;
  }

  const bucketExists = buckets.find(b => b.name === 'cartridges');
  if (!bucketExists) {
    console.log('Creating "cartridges" bucket...');
    const { error: createError } = await supabase.storage.createBucket('cartridges', {
      public: false,
      allowedMimeTypes: ['application/octet-stream'],
      fileSizeLimit: 5242880 // 5MB
    });
    if (createError) {
      console.error('Failed to create bucket:', createError);
      return;
    }
  }

  // 2. Upload Files
  const cartridgesDir = path.resolve(process.cwd(), 'cartridges');
  const files = fs.readdirSync(cartridgesDir).filter(f => f.endsWith('.tah'));

  for (const file of files) {
    const filePath = path.join(cartridgesDir, file);
    const fileBuffer = fs.readFileSync(filePath);

    console.log(`Uploading ${file}...`);
    const { error: uploadError } = await supabase.storage
      .from('cartridges')
      .upload(file, fileBuffer, {
        upsert: true,
        contentType: 'application/octet-stream'
      });

    if (uploadError) {
      console.error(`Failed to upload ${file}:`, uploadError.message);
    } else {
      console.log(`✅ ${file} synchronized.`);
    }
  }

  console.log('🎉 TAH Migration Complete.');
}

migrateCartridges();
