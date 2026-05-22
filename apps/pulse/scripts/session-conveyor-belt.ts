import { createClient } from '@supabase/supabase-js';
import { TAHBuilder, type TAHInput } from '../lib/core/tah_builder';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const builder = new TAHBuilder(0.001, 14);

/**
 * Session Conveyor Belt
 * Harvesting intelligence events and forging them into TAH cartridges.
 */
async function runConveyorBelt() {
  console.log('🚀 [CONVEYOR_BELT] Initiating Intelligence Harvest...');

  // 1. Fetch recent events (Last 24 hours)
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  
  const { data: events, error } = await supabase
    .from('intelligence_events')
    .select('*')
    .gte('created_at', twentyFourHoursAgo);

  if (error) {
    console.error('❌ [CONVEYOR_BELT] Failed to fetch events:', error.message);
    // Note: This might fail if table doesn't exist yet, which is expected in some Alpha states
    return;
  }

  if (!events || events.length === 0) {
    console.log('💤 [CONVEYOR_BELT] No new events detected. Belt idle.');
    return;
  }

  console.log(`📡 [CONVEYOR_BELT] Processing ${events.length} events...`);

  // 2. Group events by Actor (User/Session)
  const sessions: Record<string, any[]> = {};
  events.forEach(event => {
    const actorId = event.actor_id || 'anonymous_recon';
    if (!sessions[actorId]) sessions[actorId] = [];
    sessions[actorId].push(event);
  });

  // 3. Forge Cartridges for each Session
  for (const [actorId, sessionEvents] of Object.entries(sessions)) {
    console.log(`⚒️ [SESSION_FORGE] Forging memory for actor: ${actorId}`);

    const inputs: TAHInput[] = sessionEvents.map(e => ({
      keywords: [e.type, actorId, 'RECON'],
      data: `${e.description} | Target: ${e.target_id || 'N/A'} | Meta: ${JSON.stringify(e.metadata)}`,
      type: 1
    }));

    const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '_');
    const fileName = `session_${actorId}_${dateStr}.tah`;
    const buffer = builder.forge(inputs);

    // 4. Upload to Grid Storage
    const { error: uploadError } = await supabase.storage
      .from('cartridges')
      .upload(`sessions/${fileName}`, buffer, {
        upsert: true,
        contentType: 'application/octet-stream'
      });

    if (uploadError) {
      console.error(`❌ [SESSION_FORGE_ERROR] ${fileName}:`, uploadError.message);
    } else {
      console.log(`✅ [SESSION_FORGE_SUCCESS] Memory deployed to grid: ${fileName}`);
    }
  }

  console.log('🏁 [CONVEYOR_BELT] Cycle complete.');
}

runConveyorBelt().catch(err => {
  console.error('CRITICAL FAILURE in Conveyor Belt:', err);
});
