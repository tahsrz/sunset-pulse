import connectDB from '../lib/core/database.js';
import User from '../models/User.js';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { supabase } from '../lib/supabase.js';

dotenv.config({ path: '.env.local' });

async function verifySystem() {
  try {
    // 1. Verify MongoDB
    await connectDB();
    console.log('✅ MongoDB Connection Established.');

    // 2. Verify User Schema
    const adminEmail = process.env.ADMIN_EMAIL || 'tahsrz@gmail.com';
    const user = await User.findOne({ email: adminEmail });

    if (user) {
      console.log(`✅ User Found: ${user.email}`);
      console.log(`📊 Subscription Status: ${user.isSubscribed ? 'ACTIVE' : 'LOCKED'}`);
    } else {
      console.warn('⚠️ Admin user not found in database.');
    }

    // 3. Verify TAH Cloud Retrieval
    console.log('\n🔍 Verifying TAH Cloud Storage Fallback...');
    const testCartridge = 'neighborhood_intel.tah';
    const { data, error } = await supabase.storage
      .from('cartridges')
      .download(testCartridge);

    if (error) {
      console.error(`❌ TAH Cloud Retrieval Failed for ${testCartridge}:`, error.message);
    } else {
      console.log(`✅ TAH Cloud Retrieval Success: ${testCartridge} (${data.size} bytes)`);
    }

    console.log('\n--- VERIFICATION COMPLETE ---');
    process.exit(0);
  } catch (err) {
    console.error('❌ Verification Failed:', err.message);
    process.exit(1);
  }
}

verifySystem();
