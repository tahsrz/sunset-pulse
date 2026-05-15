import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

async function checkProperties() {
  const { supabaseAdmin } = await import('../lib/supabase.js');
  
  console.log('🔍 [SCHEMA_AUDIT] Checking properties table...');
  
  const { data, error } = await supabaseAdmin
    .from('properties')
    .select('id, name, type')
    .limit(10);

  if (error) {
    console.error('❌ [SCHEMA_AUDIT] Error:', error.message);
  } else {
    console.log(`✅ [SCHEMA_AUDIT] Sample properties:`);
    console.table(data);
  }
}

checkProperties();
