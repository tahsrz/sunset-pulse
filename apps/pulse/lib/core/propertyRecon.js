import { unstable_cache } from 'next/cache';
import fs from 'fs';
import path from 'path';
import connectDB from './database';
import Property from '@/models/Property';
import Lead from '@/models/Lead';
import { calculatePulseScore } from '../intelligence/neighborhoodIntelligence';

// Load Yield Intelligence from the crunched dataset
let yieldMap = {};
try {
  const yieldDataPath = path.join(process.cwd(), 'private/yield_intelligence.json');
  if (fs.existsSync(yieldDataPath)) {
    const rawData = JSON.parse(fs.readFileSync(yieldDataPath, 'utf8'));
    yieldMap = rawData.reduce((acc, curr) => {
      acc[curr.county.toLowerCase()] = curr;
      return acc;
    }, {});
  }
} catch (e) {
  console.error('[YIELD_LOAD_ERROR]: Yield intelligence not available.', e.message);
}

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

    // Sitewide Popularity and Intelligence Integration
    const propertiesWithIntelligence = properties.map(p => {
      const county = p.location.city; // Using city as a rough proxy for county if county field is missing
      const yieldData = yieldMap[county.toLowerCase()] || { cornYield: 50, wheatYield: 30 }; // Fallback yield
      
      const leadCount = leadMap[p._id.toString()] || 0;
      const pulseScore = calculatePulseScore(p.location_geo?.coordinates || [0,0]);
      
      // Popularity Score Formula:
      // 40% Lead Velocity (Interest)
      // 40% Yield/Productivity (Intrinsic Value)
      // 20% Pulse Score (Lifestyle/Amenity)
      const normalizedYield = (yieldData.cornYield / 100) * 100; // Normalize against 100 BU/AC
      const popularityScore = Math.round(
        (Math.min(leadCount * 20, 100) * 0.4) + 
        (Math.min(normalizedYield, 100) * 0.4) + 
        (pulseScore * 0.2)
      );

      return {
        ...p,
        leadCount,
        globalAvgLeads: 2,
        pulseScore,
        popularityScore,
        yieldIntel: yieldData
      };
    });

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
