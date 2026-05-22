require('dotenv').config({ path: '.env.local' });
const { supabase } = require('../lib/supabase');

async function checkRegistry() {
  const { data, error } = await supabase.from('scythe_registry').select('*').limit(5);
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Sample Registry Data:', JSON.stringify(data, null, 2));
  }
}

checkRegistry();
