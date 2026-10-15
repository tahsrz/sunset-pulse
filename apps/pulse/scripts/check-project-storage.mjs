import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import { inspectProjectStorage } from '../lib/storage/projectStorageMaintenance.mjs';

// Read-only diagnostic; never invokes a worker or sends notifications.
dotenv.config({ path: fileURLToPath(new URL('../.env.local', import.meta.url)), quiet: true });
const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Storage inspection requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
  process.exitCode = 1;
} else {
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const inspection = await inspectProjectStorage(client);
  console.log(JSON.stringify(inspection, null, 2));
  if (inspection.status !== 'healthy') process.exitCode = 2;
}
