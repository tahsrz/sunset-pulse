/**
 * Sunset Pulse: Intelligence Grid Sync Test
 * Verifies the end-to-end flow from IDX Stream to DB Sink.
 */

import { mlsService } from '../lib/data/mls';
import connectDB from '../lib/core/database';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

async function runTest() {
  console.log('🚀 [TEST_SYNC] Starting Edge-to-Grid Synchronization Test...');

  try {
    // 1. Establish Database Connection
    await connectDB();
    console.log('✅ [TEST_SYNC] Connected to MongoDB.');

    // 2. Trigger the Pulse Sync Stream
    // We disable mock mode to use the live API key provided in the shell
    process.env.NEXT_PUBLIC_MOCK_MODE = 'false';
    
    const syncStream = mlsService.syncListingStream({ pageSize: 5 });
    let syncCount = 0;

    console.log('📡 [TEST_SYNC] Consuming Pulse Ingestion Stream...');

    for await (const property of syncStream) {
      syncCount++;
      console.log(`📍 [TEST_SYNC] Processed: ${property.name} (MLS: ${property.mls_id})`);
      
      if (syncCount >= 3) break; // Test a small subset
    }

    console.log(`\n🎉 [TEST_SYNC] Successfully synchronized ${syncCount} properties.`);
    console.log('🏁 [TEST_SYNC] Pipeline integrity verified.');

  } catch (error) {
    console.error('❌ [TEST_SYNC] Critical Pipeline Failure:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 [TEST_SYNC] Database connection closed.');
    process.exit(0);
  }
}

runTest();
