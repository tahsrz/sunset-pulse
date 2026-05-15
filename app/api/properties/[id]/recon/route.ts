export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { fetchOSMAmenities } from '@/lib/data/external/osm';
import Property from '@/models/Property';
import connectDB from '@/lib/core/database';
import { successResponse, errorResponse } from '@/lib/core/apiResponse';
import { IntelligenceVault } from '@/lib/core/intelligenceVault';
import { calculatePulseScore, getDistance } from '@/lib/intelligence/neighborhoodIntelligence';
import { calculateTacticalYield, calculateMarketMomentum } from '@/lib/intelligence/financialIntelligence';
import { createClient } from '@/utils/supabase/server';

/**
 * GET /api/properties/[id]/recon
 * Performs localized reconnaissance with Intelligence Vault Persistence.
 */
export const GET = async (request: NextRequest, { params }: { params: { id: string } }) => {
  try {
    await connectDB();
    const { id } = params;

    const property: any = await Property.findById(id).lean();
    if (!property) return errorResponse('Asset not found in grid.', 404);

    const [lng, lat] = property.location_geo.coordinates;

    // Fetch SiteConfig for Dynamic Context
    const supabase = createClient();
    const { data: sbConfig } = await supabase
      .from('site_config')
      .select('intelligence, branding')
      .eq('agent_id', 'taz-realty-001')
      .single();

    const grillConfig = sbConfig?.intelligence?.grill || {
      name: 'Sunset Gas & Grill',
      coordinates: [-97.0403, 32.8998]
    };
    
    const activeVibe = sbConfig?.branding?.siteName || 'Sunset'; 

    // Calculate Engagement Density (Last 48 Hours)
    const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    const { count: recentVisits } = await supabase
      .from('intelligence_events')
      .select('*', { count: 'exact', head: true })
      .eq('event_type', 'PROPERTY_VIEW')
      .eq('target_id', id)
      .gte('created_at', fortyEightHoursAgo);

    // Use Intelligence Vault for Grid Persistence
    const reconData = await IntelligenceVault.resolve(id, 'neighborhood', async () => {
      const osmStats = await fetchOSMAmenities(lat, lng, 3000);
      
      const hubDistance = getDistance(
        lat, lng,
        grillConfig.coordinates[1], grillConfig.coordinates[0]
      );

      const yieldData = calculateTacticalYield(property);
      const momentumData = calculateMarketMomentum(property);
      const pulseScore = calculatePulseScore(property.location_geo.coordinates, [], grillConfig.coordinates, osmStats, activeVibe);

      return {
        propertyId: id,
        neighborhood: {
          pulseScore,
          neural_status: pulseScore > 80 ? 'CRITICAL_RESONANCE' : pulseScore > 50 ? 'STABLE_GRID' : 'LOW_SIGNAL',
          vibe_alignment: activeVibe,
          hub: {
            name: grillConfig.name,
            distance: parseFloat(hubDistance.toFixed(2)),
            unit: 'miles',
            status: hubDistance < 3 ? 'TACTICAL_ADVANTAGE' : 'OPERATIONAL_REACH'
          },
          schools: {
            count: osmStats.educationNodes || 1,
            proximity: osmStats.educationNodes > 0 ? 'Localized Sector' : 'Moderate',
            rating: 'A-'
          },
          hospitals: {
            count: osmStats.medicalNodes || 1,
            proximity: osmStats.medicalNodes > 0 ? 'Immediate Response' : 'Standard',
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
        financial: {
          yield: yieldData,
          market: momentumData,
          investment_grade: yieldData.grade
        },
        engagement: {
          visits_48h: recentVisits || 0,
          velocity: (recentVisits || 0) > 10 ? 'HIGH' : (recentVisits || 0) > 3 ? 'MODERATE' : 'STABLE'
        },
        raw_signals: osmStats,
        timestamp: new Date().toISOString()
      };
    });

    return successResponse(reconData);
  } catch (error: any) {
    console.error('Neighborhood reconnaissance failed:', error);
    return errorResponse('Neighborhood reconnaissance failed.', 500, error.message);
  }
};
