import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

async function checkSchema() {
  const { supabaseAdmin } = await import('../lib/supabase');
  
  // @ts-ignore
  console.log('SUPABASE_URL:', supabaseAdmin.supabaseUrl || 'unknown');
  
  console.log('🔍 [SCHEMA_AUDIT] Fetching column names for table: leads...');
  
  const { data, error } = await supabaseAdmin
    .from('leads')
    .select('*')
    .limit(1);

  if (error) {
    console.error('❌ [SCHEMA_AUDIT] Error fetching leads:', error.message);
    return;
  }

  if (data && data.length > 0) {
    console.log('✅ [SCHEMA_AUDIT] Sample lead found:', JSON.stringify(data[0], null, 2));
  } else {
    console.log('⚠️ [SCHEMA_AUDIT] No data in leads table to inspect columns.');
  }
}

checkSchema();
