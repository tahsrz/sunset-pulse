import { mlsService } from '../lib/data/mls.ts';
import connectDB from '../lib/core/database.js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function runMlsPopulation() {
  console.log('🚀 Starting MLS to Grid Population...');
  
  // Connect to Mongo just in case the current sync requires it
  await connectDB();

  let count = 0;
  const stream = mlsService.syncListingStream({
      'city': 'Dallas', // Start with Dallas for Alpha testing
      'pageSize': 20
  });

  for await (const property of stream) {
    count++;
    if (count % 5 === 0) {
      console.log(`📡 [PULSE_POPULATE] Processed ${count} listings...`);
    }
  }

  console.log(`🎉 MLS Population Complete. Synchronized ${count} properties to the grid.`);
  process.exit(0);
}

runMlsPopulation().catch(err => {
  console.error('CRITICAL FAILURE during MLS Population:', err);
  process.exit(1);
});
