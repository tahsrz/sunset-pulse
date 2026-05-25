import { unstable_cache } from 'next/cache';
import connectDB from './database';
import Property from '@/models/Property';
import Lead from '@/models/Lead';

/**
 * Standardize property pricing.
 * Dynamically detects monthly rates >= $20,000 that are actually listing prices,
 * and normalizes them into property.price, purging the monthly rental rate suffix.
 */
export function normalizePropertyPricing(property) {
  if (!property) return property;
  const cloned = { ...property };

  // Handle nested rates object (MongoDB style)
  if (cloned.rates && typeof cloned.rates === 'object' && cloned.rates.monthly) {
    const monthlyRate = Number(cloned.rates.monthly);
    if ((!cloned.price || cloned.price <= 0) && monthlyRate >= 20000) {
      cloned.price = monthlyRate;
      cloned.rates = { ...cloned.rates };
      delete cloned.rates.monthly;
    }
  }

  // Handle flat rates_monthly structure
  if (cloned.rates_monthly) {
    const monthlyRate = Number(cloned.rates_monthly);
    if ((!cloned.price || cloned.price <= 0) && monthlyRate >= 20000) {
      cloned.price = monthlyRate;
      delete cloned.rates_monthly;
    }
  }

  // Handle serialized rates JSON string
  if (typeof cloned.rates === 'string') {
    try {
      const parsedRates = JSON.parse(cloned.rates);
      if (parsedRates && parsedRates.monthly) {
        const monthlyRate = Number(parsedRates.monthly);
        if ((!cloned.price || cloned.price <= 0) && monthlyRate >= 20000) {
          cloned.price = monthlyRate;
          delete parsedRates.monthly;
          cloned.rates = JSON.stringify(parsedRates);
        }
      }
    } catch (e) {
      // Safe fallback
    }
  }

  return cloned;
}

export async function getProperties({ showFeatured = false, page = 1, pageSize = 6 } = {}) {
  try {
    await connectDB();

    let properties;
    let total = 0;

    const isMock = process.env.NEXT_PUBLIC_MOCK_MODE === 'true';
    const demoFilter = isMock ? {} : { is_demo: { $ne: true } };

    if (showFeatured) {
      properties = await Property.find({ is_featured: true, ...demoFilter }).lean();
    } else {
      const skip = (page - 1) * pageSize;
      total = await Property.countDocuments(demoFilter);
      properties = await Property.find(demoFilter).skip(skip).limit(pageSize).lean();
    }

    // Aggregate Lead counts for Intelligence Model
    const propertyIds = properties.map(p => p._id);
    const leadCounts = await Lead.aggregate([
      { $match: { property: { $in: propertyIds } } },
      { $group: { _id: '$property', count: { $sum: 1 } } }
    ]);

    const leadMap = leadCounts.reduce((acc, curr) => {
      acc[curr._id.toString()] = curr.count;
      return acc;
    }, {});

    const propertiesWithIntelligence = properties.map(p => ({
      ...p,
      leadCount: leadMap[p._id.toString()] || 0,
      globalAvgLeads: 2
    }));

    if (showFeatured) {
      return propertiesWithIntelligence.map(normalizePropertyPricing);
    }

    return { total, properties: propertiesWithIntelligence.map(normalizePropertyPricing) };
  } catch (error) {
    console.error('[RECON_ERROR]: Asset acquisition failed.', error);
    return showFeatured ? [] : { total: 0, properties: [] };
  }
}

/**
 * Granular Tag-Cached query wrapper.
 * Dynamically builds a deterministic key per options config, tagged under 'properties'.
 */
export const getCachedProperties = (options = {}) => {
  return unstable_cache(
    async () => getProperties(options),
    ['properties-cache', JSON.stringify(options)],
    { tags: ['properties'] }
  )();
};
