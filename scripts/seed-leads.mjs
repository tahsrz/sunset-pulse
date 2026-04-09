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

async function seedLeads() {
  try {
    console.log("🌱 [SEED] Planting Mock Leads into the Pipeline...");

    const mockLeads = [
      { name: 'John Austin', email: 'john@austin.com', metadata: { location_interest: 'Austin', lead_category: 'Residential' }, stage: 'New', probability: 45 },
      { name: 'Sarah Dallas', email: 'sarah@dallas.com', metadata: { location_interest: 'Dallas', lead_category: 'Commercial' }, stage: 'New', probability: 60 },
      { name: 'Houston Tex', email: 'houston@gmail.com', metadata: { location_interest: 'Houston', lead_category: 'RV' }, stage: 'New', probability: 30 },
      { name: 'Fort Worthy', email: 'worth@me.com', metadata: { location_interest: 'Fort Worth', lead_category: 'Residential' }, stage: 'New', probability: 55 },
      { name: 'San Antone', email: 'san@antonio.org', metadata: { location_interest: 'San Antonio', lead_category: 'Commercial' }, stage: 'New', probability: 75 }
    ];

    const { data, error } = await supabase
      .from('leads')
      .upsert(mockLeads, { onConflict: 'email' });

    if (error) throw error;

    console.log("✅ [SEED] Success. 5 mock leads are now active in the intelligence grid.");
    process.exit(0);
  } catch (err) {
    console.error("❌ [SEED] Failed:", err.message);
    process.exit(1);
  }
}

seedLeads();
