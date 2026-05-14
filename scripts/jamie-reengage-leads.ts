import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config();

/**
 * JAMIE RE-ENGAGEMENT ENGINE
 * 
 * This script identifies leads that need re-engagement and uses Jamie AI 
 * to generate hyper-personalized hooks based on the latest MLS data.
 */
async function runJamieReengagement() {
  console.log('🧠 [JAMIE_BRAIN] Initiating Re-engagement Cycle...');

  const { supabaseAdmin } = await import('../lib/supabase');
  const { generateHighStakesHook } = await import('../lib/ai/jamie');

  try {
    // 1. Fetch leads that might need re-engagement
    // In Alpha, we'll just grab the top 10 for safety
    const { data: leads, error: leadError } = await supabaseAdmin
      .from('leads')
      .select('*')
      .limit(10);

    if (leadError) throw leadError;
    if (!leads || leads.length === 0) {
      console.log('✅ [JAMIE_BRAIN] No leads found for re-engagement.');
      return;
    }

    console.log(`📊 [JAMIE_BRAIN] Processing ${leads.length} leads...`);

    for (const lead of leads) {
      console.log(`📡 [JAMIE_BRAIN] Analyzing lead: ${lead.name} (${lead.email})`);

      // 2. Fetch a relevant property for the lead
      // For now, we'll try to match by property_id if it exists, 
      // otherwise grab a random "Residential" property as a 'Market Update'
      let property;
      if (lead.property_id) {
        const { data: propData } = await supabaseAdmin
          .from('properties')
          .select('*')
          .eq('mls_id', lead.property_id)
          .single();
        property = propData;
      }

      if (!property) {
        const { data: randomProps } = await supabaseAdmin
          .from('properties')
          .select('*')
          .limit(1);
        property = randomProps?.[0];
      }

      if (!property) {
        console.warn(`⚠️ [JAMIE_BRAIN] No properties available to engage ${lead.email}`);
        continue;
      }

      // Supabase has a flat structure, Jamie AI expects nested location
      const normalizedProperty = {
        ...property,
        location: {
          city: property.city,
          state: property.state,
          zipcode: property.zip
        }
      };

      // 3. Generate the High-Stakes Hook
      console.log(`🤖 [JAMIE_BRAIN] Generating hook for ${lead.name} using asset ${property.mls_id}...`);
      const hook = await generateHighStakesHook(lead, normalizedProperty);

      // 4. Update the lead with the new hook
      // Fallback: Store in metadata since the explicit column is missing in current grid
      const updatedMetadata = {
        ...(lead.metadata || {}),
        reengagement_hook: hook,
        last_activity: new Date().toISOString()
      };

      const { error: updateError } = await supabaseAdmin
        .from('leads')
        .update({ 
          metadata: updatedMetadata
        })
        .eq('id', lead.id);

      if (updateError) {
        console.error(`❌ [JAMIE_BRAIN] Failed to update lead ${lead.email}:`, updateError.message);
      } else {
        console.log(`✅ [JAMIE_BRAIN] Hook synchronized for ${lead.email}`);
      }
    }

    console.log('🏁 [JAMIE_BRAIN] Re-engagement cycle complete.');

  } catch (error: any) {
    console.error('❌ [JAMIE_BRAIN] Critical Failure:', error.message);
    process.exit(1);
  }
}

runJamieReengagement();
