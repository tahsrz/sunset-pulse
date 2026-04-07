import connectDB from './database';
import Property from '@/models/Property';
import Lead from '@/models/Lead';

/**
 * Direct reconnaissance for property assets.
 * Avoids fetch overhead when running on the server.
 */
export async function getProperties({ showFeatured = false, page = 1, pageSize = 6 } = {}) {
  try {
    await connectDB();

    let properties;
    let total = 0;

    if (showFeatured) {
      properties = await Property.find({ is_featured: true }).lean();
    } else {
      const skip = (page - 1) * pageSize;
      total = await Property.countDocuments({});
      properties = await Property.find({}).skip(skip).limit(pageSize).lean();
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
      return propertiesWithIntelligence;
    }

    return { total, properties: propertiesWithIntelligence };
  } catch (error) {
    console.error('[RECON_ERROR]: Asset acquisition failed.', error);
    return showFeatured ? [] : { total: 0, properties: [] };
  }
}
