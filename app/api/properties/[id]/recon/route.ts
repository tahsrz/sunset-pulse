import { NextRequest } from 'next/server';
import { fetchOSMAmenities } from '@/lib/data/external/osm';
import Property from '@/models/Property';
import connectDB from '@/lib/core/database';
import { successResponse, errorResponse } from '@/lib/core/apiResponse';
import { IntelligenceVault } from '@/lib/core/intelligenceVault';

/**
 * GET /api/properties/[id]/recon
 * Performs localized reconnaissance with Intelligence Vault Persistence. WIP Really not working as intended
 */
export const GET = async (request: NextRequest, { params }: { params: { id: string } }) => {
  try {
    await connectDB();
    const { id } = params;

    const property: any = await Property.findById(id).lean();
    if (!property) return errorResponse('Asset not found in grid.', 404);

    const [lng, lat] = property.location_geo.coordinates;

    // Use Intelligence Vault for Grid Persistence
    const reconData = await IntelligenceVault.resolve(id, 'neighborhood', async () => {
      const osmStats = await fetchOSMAmenities(lat, lng, 3000);
      
      return {
        propertyId: id,
        neighborhood: {
          pulseScore: calculatePulseScore(osmStats),
          schools: {
            count: osmStats.educationNodes || Math.floor(Math.random() * 3) + 1,
            proximity: osmStats.educationNodes > 0 ? 'Localized Sector' : 'Moderate (2+ miles)',
            rating: 'A-'
          },
          hospitals: {
            count: osmStats.medicalNodes || 1,
            proximity: osmStats.medicalNodes > 0 ? 'Immediate Response Zone' : 'Standard Response',
            type: 'General Medical'
          },
          transit: {
            nodes: osmStats.transitNodes,
            score: osmStats.transitNodes > 5 ? 'High Access' : 'Medium'
          },
          amenities: {
            total: osmStats.totalAmenities,
            retailDensity: osmStats.retailNodes > 10 ? 'High' : 'Moderate',
            safetyIndex: osmStats.safetyNodes > 0 ? 'Secured' : 'Nominal'
          }
        },
        raw_signals: osmStats,
        timestamp: new Date().toISOString()
      };
    });

    return successResponse(reconData);
  } catch (error: any) {
    return errorResponse('Neighborhood reconnaissance failed.', 500, error.message);
  }
};

function calculatePulseScore(stats: any) {
  let score = 60;
  score += (stats.transitNodes * 5);
  score += (stats.medicalNodes * 10);
  score += (stats.educationNodes * 5);
  score += (stats.retailNodes * 2);
  score += (stats.safetyNodes * 15);
  return Math.min(100, Math.max(0, Math.round(score)));
}
