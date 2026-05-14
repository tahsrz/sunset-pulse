import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

async function verifyGoldenPath() {
  const { getGroundTruth } = await import('../lib/core/surgicalRetriever');

  console.log('🧪 [GOLDEN_PATH] Initiating Surgical Extraction Verification...');
  
  // The query should match a keyword in the law we injected
  // "[REAL_ESTATE_LAW_TX_2026]: All properties in the Fort Worth grid..."
  const queries = ['Real Estate Law', 'Fort Worth', 'soil density'];
  
  for (const query of queries) {
    console.log(`\n📡 [GOLDEN_PATH] Querying for: "${query}"...`);
    const results = await getGroundTruth(query);
    
    if (results.length > 0) {
      console.log(`✅ [GOLDEN_PATH] Matches found (${results.length}):`);
      results.forEach(res => {
        console.log(`   [${res.source}] ${res.data}`);
      });
      
      const foundNewLaw = results.some(res => res.data.includes('REAL_ESTATE_LAW_TX_2026'));
      if (foundNewLaw) {
        console.log('\n🌟 [GOLDEN_PATH] SUCCESS: The new Real Estate Law was surgically extracted from the user_memories cartridge.');
      }
    } else {
      console.log(`⚠️ [GOLDEN_PATH] No matches found for "${query}".`);
    }
  }

  console.log('\n🏁 [GOLDEN_PATH] Verification Cycle Complete.');
}

verifyGoldenPath();
