import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
  console.log('--- INFORMATION_SCHEMA CHECK ---');
  
  const { data, error } = await supabase
    .from('leads')
    .select('id')
    .limit(1);

  if (error) {
    console.error('Error fetching leads:', error);
    return;
  }

  // Use a raw query via rpc if available, or just use select on a system table if permitted
  // Usually, we can't query information_schema directly via PostgREST unless exposed
  // But we can try to use supabase.rpc('log_intelligence_event') logic to see if we can run SQL
  
  // Since we can't run raw SQL easily, let's try to select EVERY possible column name we've seen
  const candidates = ['id', 'name', 'email', 'phone', 'property_id', 'budget', 'timeframe', 'source', 'stage', 'sttage', 'engagement_velocity', 'probability', 'jamie_notes', 'metadata', 'created_at', 'updated_at', 'reengagement_hook', 'last_activity'];
  
  const results: Record<string, boolean> = {};
  for (const col of candidates) {
    const { error } = await supabase.from('leads').select(col).limit(1);
    results[col] = !error;
  }
  
  console.log('Column Availability:');
  console.log(JSON.stringify(results, null, 2));
}

checkSchema();
