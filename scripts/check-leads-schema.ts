import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

async function checkSchema() {
  const { supabaseAdmin } = await import('../lib/supabase');
  
  console.log('🔍 [SCHEMA_AUDIT] Fetching column names for table: leads...');
  
  // We can't easily query information_schema via the client without RPC or direct SQL
  // but we can try to fetch a single row and look at the keys
  const { data, error } = await supabaseAdmin
    .from('leads')
    .select('*')
    .limit(1);

  if (error) {
    console.error('❌ [SCHEMA_AUDIT] Error fetching leads:', error.message);
    return;
  }

  if (data && data.length > 0) {
    console.log('✅ [SCHEMA_AUDIT] Sample lead found. Columns:', Object.keys(data[0]).join(', '));
  } else {
    console.log('⚠️ [SCHEMA_AUDIT] No data in leads table to inspect columns.');
  }
}

checkSchema();
