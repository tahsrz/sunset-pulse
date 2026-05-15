import './load-env.js';
import connectDB from '../lib/core/database.js';
import User from '../models/User.js';
import { supabaseAdmin } from '../lib/supabase.js';

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
    
    // Debug: Check if service role key is actually loaded
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
        console.warn('⚠️ SUPABASE_SERVICE_ROLE_KEY not found in process.env');
    }

    const { data, error } = await supabaseAdmin.storage
      .from('cartridges')
      .download(testCartridge);

    if (error) {
      console.error(`❌ TAH Cloud Retrieval Failed for ${testCartridge}:`, error.message);
      if (error.message === 'fetch failed') {
          console.error('   (Potential network error or invalid SUPABASE_URL)');
      }
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
