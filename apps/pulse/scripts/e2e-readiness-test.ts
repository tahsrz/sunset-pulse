import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

async function testIntelligenceLoop() {
  const { getGroundTruth } = await import('../lib/core/surgicalRetriever');
  const { generateHighStakesHook } = await import('../lib/ai/jamie');
  const { supabaseAdmin } = await import('../lib/supabase');

  console.log('📡 [E2E_TEST] Phase 1: Surgical Intelligence Retrieval...');
  const city = 'Fort Worth';
  const groundTruth = await getGroundTruth(city);
  console.log(`🎯 [E2E_TEST] Ground Truth for ${city}:`, JSON.stringify(groundTruth, null, 2));

  console.log('\n🧠 [E2E_TEST] Phase 2: Jamie AI Brain Check...');
  // Grab a sample lead and property
  const { data: lead } = await supabaseAdmin.from('leads').select('*').limit(1).single();
  const { data: property } = await supabaseAdmin.from('properties').select('*').limit(1).single();

  if (lead && property) {
    console.log(`🤖 [E2E_TEST] Generating hook for ${lead.email} using ${property.mls_id}...`);
    
    // Normalize for Jamie
    const normalizedProperty = {
      ...property,
      location: { city: property.city, state: property.state, zipcode: property.zip }
    };

    const hook = await generateHighStakesHook(lead, normalizedProperty);
    console.log(`✅ [E2E_TEST] Jamie Hook Generated:`, JSON.stringify(hook, null, 2));

    console.log('\n💾 [E2E_TEST] Phase 3: Database Synchronization...');
    const { error } = await supabaseAdmin
      .from('leads')
      .update({ metadata: { ...lead.metadata, e2e_test_hook: hook, tested_at: new Date().toISOString() } })
      .eq('id', lead.id);

    if (!error) {
      console.log('🏁 [E2E_TEST] End-to-End Loop Success. Grid is operational.');
    } else {
      console.error('❌ [E2E_TEST] Sync failed:', error.message);
    }
  } else {
    console.warn('⚠️ [E2E_TEST] Insufficient data (leads/properties) for full loop test.');
  }
}

testIntelligenceLoop();
