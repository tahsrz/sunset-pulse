/**
 * @db-safety-reviewed
 * COMPREHENSIVE DATABASE CLEANUP SCRIPT
 * This script identifies and removes duplicate records across all core models
 * using normalized matching and composite keys.
 */

import './load-env.js';
import mongoose from 'mongoose';
import connectDB from '../lib/core/database.js';
import MenuItem from '../models/MenuItem.js';
import Property from '../models/Property.js';
import Coupon from '../models/Coupon.js';
import Story from '../models/Story.js';
import Vibe from '../models/Vibe.js';
import User from '../models/User.js';
import Lead from '../models/Lead.js';
import Entity from '../models/Entity.js';
import Booking from '../models/Booking.js';

async function deduplicate(Model, uniqueKey, options = {}) {
  const { normalize = false } = options;
  const keys = Array.isArray(uniqueKey) ? uniqueKey : [uniqueKey];
  const keyLabel = keys.join('+');
  
  console.log(`🧹 De-duplicating ${Model.modelName} by ${keyLabel}${normalize ? ' (normalized)' : ''}...`);

  // Build match stage to exclude documents missing any of the unique keys
  const matchStage = {};
  keys.forEach(key => {
    matchStage[key] = { 
      $exists: true, 
      $ne: null, 
      $nin: ['', 'undefined', 'null', 'UNDEFINED', 'NULL'] 
    };
  });

  // Build group ID
  let groupId;
  if (keys.length === 1) {
    const key = keys[0];
    groupId = normalize ? { $trim: { input: { $toLower: `$${key}` } } } : `$${key}`;
  } else {
    groupId = {};
    keys.forEach(key => {
      // Sanitize key name for MongoDB group _id (dots not allowed in keys)
      const safeKey = key.replace(/\./g, '_');
      groupId[safeKey] = normalize ? { $trim: { input: { $toLower: `$${key}` } } } : `$${key}`;
    });
  }

  const duplicates = await Model.aggregate([
    { $match: matchStage },
    { $sort: { createdAt: 1 } }, // Oldest first to keep newest
    {
      $group: {
        _id: groupId,
        ids: { $push: '$_id' },
        count: { $sum: 1 }
      }
    },
    {
      $match: {
        count: { $gt: 1 }
      }
    }
  ]);

  let totalDeleted = 0;
  for (const group of duplicates) {
    // Keep the last one (most recently created), delete the rest
    const toDelete = group.ids.slice(0, group.ids.length - 1);
    const result = await Model.deleteMany({ _id: { $in: toDelete } });
    totalDeleted += result.deletedCount;
    const groupDesc = typeof group._id === 'object' ? JSON.stringify(group._id) : group._id;
    console.log(`   - Removed ${result.deletedCount} duplicates for ${keyLabel}='${groupDesc}'`);
  }

  console.log(`✅ Finished ${Model.modelName}. Total deleted: ${totalDeleted}`);
}

async function cleanupMenuItems() {
  console.log('🧹 Specific Cleanup for MenuItems...');
  
  // 1. Remove all items with no ID or invalid IDs
  const resultNoId = await MenuItem.deleteMany({ 
    $or: [
      { id: { $exists: false } }, 
      { id: null }, 
      { id: 'undefined' },
      { id: '' },
      { id: 'null' }
    ] 
  });
  console.log(`   - Deleted ${resultNoId.deletedCount} items with missing/invalid IDs.`);

  // 2. De-dupe by name + agentId (normalized)
  await deduplicate(MenuItem, ['name', 'agentId'], { normalize: true });
  
  // 3. Final de-dupe by id + agentId
  await deduplicate(MenuItem, ['id', 'agentId']);
}

async function main() {
  await connectDB();

  console.log('🚀 Starting Comprehensive Database Cleanup...\n');

  // Core Content
  await cleanupMenuItems();
  
  console.log('\n🏠 Cleaning Properties & Bookings...');
  await deduplicate(Property, 'mls_id');
  await deduplicate(Property, 'name', { normalize: true });
  await deduplicate(Property, ['location.street', 'location.city'], { normalize: true });
  await deduplicate(Booking, ['property', 'user', 'checkIn', 'checkOut']);
  
  console.log('\n🎫 Cleaning Coupons, Stories, and Vibes...');
  await deduplicate(Coupon, 'code'); 
  await deduplicate(Story, 'uid');
  await deduplicate(Vibe, 'vibeId');
  
  console.log('\n👥 Cleaning Users and Leads...');
  await deduplicate(User, 'email', { normalize: true });
  await deduplicate(Lead, 'email', { normalize: true });
  
  console.log('\n🏢 Cleaning Entities...');
  await deduplicate(Entity, 'uid');

  console.log('\n✨ Database Cleanup Complete.');
}

main()
  .catch((err) => {
    console.error('❌ Cleanup failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await mongoose.disconnect();
  });


