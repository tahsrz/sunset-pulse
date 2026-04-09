import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ ERROR: Supabase credentials missing in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function syncLeads() {
  try {
    console.log("⚡ [MOCK_SYNC] Initiating Anomaly Data Injection...");
    
    // 1. Fetch all leads
    const { data: leads, error: fetchError } = await supabase
      .from('leads')
      .select('id, name, email');

    if (fetchError) throw fetchError;

    console.log(`🔍 Found ${leads.length} leads in the pipeline.`);

    const locations = ['Austin', 'Dallas', 'Houston', 'San Antonio', 'Fort Worth'];
    const categories = ['Residential', 'RV', 'Commercial'];

    const updates = leads.map((lead, index) => ({
      id: lead.id,
      location_interest: locations[index % locations.length],
      lead_category: categories[index % categories.length],
      status: 'New'
    }));

    if (updates.length > 0) {
      console.log(`📡 [INTEL_PUSH] Updating ${updates.length} leads with reconnaissance profiles...`);
      const { error: updateError } = await supabase
        .from('leads')
        .upsert(updates);

      if (updateError) throw updateError;
      console.log("✅ [MOCK_SYNC] Success. Intelligence grid synchronized.");
    } else {
      console.log("⚠️ [MOCK_SYNC] No leads found to update.");
    }

  } catch (err) {
    console.error("❌ [MOCK_SYNC] Failed:", err.message);
  }
}

syncLeads();
