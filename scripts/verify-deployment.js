import connectDB from './config/database.js';
import User from './models/User.js';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function verifySystem() {
  try {
    await connectDB();
    console.log('✅ MongoDB Connection Established.');

    // 1. Verify User Schema for Subscription and Interests
    const adminEmail = process.env.ADMIN_EMAIL || 'tahsrz@gmail.com';
    const user = await User.findOne({ email: adminEmail });

    if (user) {
      console.log(`✅ User Found: ${user.email}`);
      console.log(`📊 Subscription Status: ${user.isSubscribed ? 'ACTIVE' : 'LOCKED'}`);
      console.log(`📡 Current Interests: ${user.currentInterests || 'NOT_SET'}`);
      
      // Toggle for testing if requested
      // user.isSubscribed = true;
      // await user.save();
      // console.log('🛠️ TEST_MODE: Subscription forced to ACTIVE.');
    } else {
      console.warn('⚠️ Admin user not found in database. Run login first.');
    }

    console.log('\n--- VERIFICATION COMPLETE ---');
    process.exit(0);
  } catch (err) {
    console.error('❌ Verification Failed:', err.message);
    process.exit(1);
  }
}

verifySystem();
