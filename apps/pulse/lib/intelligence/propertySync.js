import connectDB from '@/lib/core/database';
import Property from '@/models/Property';
import { gatekeeper } from '@/lib/core/gatekeeper';
import { upsertCanonicalListing } from '@/lib/data/listingRepository';

/**
 * Legacy compatibility projection. Postgres is the canonical listing store;
 * Mongo remains available while internal/RV authoring is migrated.
 */
export const upsertPropertyToMongo = async (propertyData) => {
  try {
    await connectDB();
    const { _id, ...cleanData } = propertyData;

    if (Array.isArray(cleanData.images)) {
      cleanData.images = cleanData.images.map((image) => {
        if (!image || image.startsWith('http') || image.startsWith('/')) return image;
        return `/${image}`;
      });
    }

    return await Property.findOneAndUpdate(
      { mls_id: propertyData.mls_id },
      {
        $set: {
          ...cleanData,
          owner: cleanData.owner || '650c8e2b1f4e1a2b3c4d5e6f',
        },
      },
      { upsert: true, new: true, runValidators: true }
    );
  } catch (error) {
    console.error(`[MONGO_SYNC_ERROR] ${propertyData.mls_id}:`, error);
    return null;
  }
};

export const upsertPropertyToSupabase = async (propertyData) => {
  return upsertCanonicalListing(propertyData);
};

/**
 * Canonical ingestion entry point. Change detection is intentionally performed
 * here only; read paths must always return unchanged active listings.
 */
export const syncPropertyToIntelligenceGrid = async (propertyData) => {
  const mlsId = propertyData.mls_id;
  const lastUpdated = propertyData.last_updated || 'STATIC';

  if (mlsId && !gatekeeper.shouldProcessListing(mlsId, lastUpdated)) {
    console.log(`[LISTING_GATE_HIT] Bypassing unchanged listing: ${mlsId}`);
    return null;
  }

  const canonicalResult = await upsertPropertyToSupabase(propertyData);
  await upsertPropertyToMongo(propertyData);
  console.log(`[GRID_SYNC] Canonical sync complete for ${mlsId}.`);
  return canonicalResult;
};
