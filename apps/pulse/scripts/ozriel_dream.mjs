import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function processAudits() {
  console.log('💀 [OZRIEL] Awakening for dream cycle...');

  // 1. Get reported false positives
  const { data: audits, error: auditError } = await supabase
    .from('intelligence_events')
    .select('*')
    .eq('event_type', 'SCYTHE_AUDIT')
    .eq('severity', 'WARNING');

  if (auditError) {
    console.error('Error fetching audits:', auditError);
    return;
  }

  console.log(`📡 [OZRIEL] Found ${audits?.length || 0} audit requests.`);

  if (audits && audits.length > 0) {
    for (const audit of audits) {
      const fragment = audit.metadata.original_fragment;
      console.log(`✂️ [OZRIEL] Scything discrepancy: "${fragment}"`);

      // Delete the pattern from registry if it exists
      const { error: deleteError } = await supabase
        .from('scythe_registry')
        .delete()
        .eq('original', fragment);

      if (deleteError) {
        console.error(`Error deleting ${fragment}:`, deleteError);
      } else {
        // Mark audit as processed
        await supabase
          .from('intelligence_events')
          .update({ severity: 'INFO', description: audit.description + ' [PROCESSED]' })
          .eq('id', audit.id);
      }
    }
  }

  // 2. Sync local registry to Supabase
  const registryPath = path.resolve('utils/jamie/memory/scythe_registry.json');
  if (fs.existsSync(registryPath)) {
    const localRegistry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
    console.log(`📦 [OZRIEL] Syncing local registry (${localRegistry.length} entries)...`);

    // Get existing to avoid duplicates
    const { data: remoteRegistry } = await supabase.from('scythe_registry').select('original');
    const remotePatterns = new Set(remoteRegistry?.map(r => r.original) || []);

    const newEntries = localRegistry
      .filter(entry => !remotePatterns.has(entry.original))
      .map(entry => ({
        original: entry.original,
        replacement: entry.replacement,
        rationale: entry.rationale,
        timestamp: entry.timestamp || new Date().toISOString()
      }));

    if (newEntries.length > 0) {
      const { error: insertError } = await supabase.from('scythe_registry').insert(newEntries);
      if (insertError) console.error('Error inserting new entries:', insertError);
      else console.log(`✅ [OZRIEL] Harvested ${newEntries.length} new patterns.`);
    } else {
      console.log('✨ [OZRIEL] Registry is pure.');
    }
  }

  console.log('🌙 [OZRIEL] Dream cycle complete. Returning to the Void.');
}

processAudits();
