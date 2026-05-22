require('dotenv').config({ path: '.env.local' });
const { supabase } = require('../lib/supabase');
const registry = require('../utils/jamie/memory/scythe_registry.json');

async function seedRegistry() {
  console.log('Seeding Scythe Registry...');
  
  try {
    const { data: existing, error: fetchError } = await supabase.from('scythe_registry').select('original');
    if (fetchError) throw fetchError;

    const existingPatterns = new Set(existing?.map(e => e.original) || []);
    const newEntries = registry.filter(entry => !existingPatterns.has(entry.original));

    if (newEntries.length === 0) {
      console.log('Registry already up to date.');
      return;
    }

    const { error } = await supabase.from('scythe_registry').insert(newEntries);

    if (error) {
      console.error('Error seeding registry:', error);
    } else {
      console.log(`Successfully added ${newEntries.length} new patterns to Scythe Registry.`);
    }
  } catch (err) {
    console.error('Critical failure in registry seeding:', err.message);
  }
}

seedRegistry();
