import { pulseSyncWorker } from './lib/data/pulse_sync_worker';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function run() {
  try {
    await pulseSyncWorker.syncHistoricalSales(80);
  } catch (err) {
    console.error('Script failed:', err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

run();
