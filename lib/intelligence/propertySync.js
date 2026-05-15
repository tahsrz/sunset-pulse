import path from 'path';
import fs from 'fs';
import connectDB from '@/lib/core/database';
import Property from '@/models/Property';
import { supabase, supabaseAdmin } from '@/lib/supabase';
import { gatekeeper } from '@/lib/core/gatekeeper';

/**
 * DATABASE_SINK: Synchronizes a single property into the MongoDB intelligence pool.
 * Uses mls_id as the primary key for conflict resolution.
 */
export const upsertPropertyToMongo = async (propertyData) => {
  await connectDB();
  
  try {
    // Standardize the payload for MongoDB
    const { _id, ...cleanData } = propertyData;
    
    const payload = {
      ...cleanData,
      owner: cleanData.owner || '650c8e2b1f4e1a2b3c4d5e6f', // Default system owner (Sunset Global Recon)
    };

    const property = await Property.findOneAndUpdate(
      { mls_id: propertyData.mls_id },
      { $set: payload },
      { upsert: true, new: true, runValidators: true }
    );
    return property;
  } catch (error) {
    console.error(`❌ [MONGO_SYNC_ERROR] ${propertyData.mls_id}:`, error);
    return null;
  }
};

/**
 * DATABASE_SINK: Synchronizes a single property into the Supabase grid.
 * This enables Jamie AI to reference live properties in lead re-engagement.
 */
export const upsertPropertyToSupabase = async (propertyData) => {
  try {
    // Supabase often uses a flatter structure for analytics/intelligence
    const payload = {
      mls_id: propertyData.mls_id,
      name: propertyData.name,
      type: propertyData.type,
      city: propertyData.location.city,
      state: propertyData.location.state,
      zip: propertyData.location.zipcode,
      beds: propertyData.beds,
      baths: propertyData.baths,
      sqft: propertyData.square_feet,
      price: propertyData.rates?.monthly || 0,
      image_url: propertyData.images?.[0] || null,
      last_updated: propertyData.last_updated || new Date().toISOString(),
      is_demo: propertyData.is_demo || false
    };

    const { error } = await supabaseAdmin
      .from('properties')
      .upsert(payload, { onConflict: 'mls_id' });

    if (error) {
        // Log skip if table doesn't exist yet (standard for partial migration state)
        console.warn(`📡 [SUPABASE_SYNC_SKIP] Table 'properties' error: ${error.message}`);
    }
  } catch (error) {
    console.error(`❌ [SUPABASE_SYNC_ERROR] ${propertyData.mls_id}:`, error);
  }
};

/**
 * ATOMIC_TRUTH_SYNC: The unified entry point for property persistence.
 */
export const syncPropertyToIntelligenceGrid = async (propertyData) => {
  const mlsId = propertyData.mls_id;
  const lastUpdated = propertyData.last_updated || 'STATIC';
  
  // 1. Surgical Gatekeeper: Bypass DB if listing is probably unchanged
  // Signature: MLS_ID + TIMESTAMP
  if (mlsId && !gatekeeper.shouldProcessListing(mlsId, lastUpdated)) {
    console.log(`🛡️ [LISTING_GATE_HIT] Bypassing sync for unchanged listing: ${mlsId}`);
    return null;
  }

  console.log(`📡 [GRID_SYNC] Commencing Atomic Truth sync for ${mlsId}...`);
  
  // Parallel execution for maximum velocity
  const [mongoResult] = await Promise.all([
    upsertPropertyToMongo(propertyData),
    upsertPropertyToSupabase(propertyData)
  ]);

  if (mongoResult) {
    console.log(`✅ [GRID_SYNC] Sync complete for ${mlsId}.`);
  }
  
  return mongoResult;
};
