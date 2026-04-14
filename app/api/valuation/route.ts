import { NextRequest } from 'next/server';
import connectDB from '@/lib/core/database';
import Valuation from '@/models/Valuation';
import { getSessionUser } from '@/lib/core/getSessionUser';
import { successResponse, errorResponse } from '@/lib/core/apiResponse';
import { applyApiRateLimit } from '@/lib/core/apiRateLimit';

// GET /api/valuation - Fetch confirmed valuations for the map
export const GET = async () => {
  try {
    await connectDB();
    const valuations = await Valuation.find({ status: 'Confirmed' });
    return successResponse(valuations);
  } catch (error: any) {
    return errorResponse('Failed to fetch valuation.', 500);
  }
};

// POST /api/valuation - Create a draft valuation
export const POST = async (request: NextRequest) => {
  try {
    await connectDB();
    const sessionUser = await getSessionUser();
    const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
    const rateLimitToken = sessionUser?.userId || ip;

    // Rate Limiting: 5 valuations per minute
    const limitResponse = await applyApiRateLimit(rateLimitToken, 5);
    if (limitResponse) return limitResponse;

    const { address, lat, lng, confirm = false, id = null } = await request.json();

    if (confirm && id) {
      // Confirm an EXISTING draft
      const valuation = await Valuation.findByIdAndUpdate(id, { status: 'Confirmed' }, { new: true });
      return successResponse({ message: 'Intelligence Grid Synchronized', valuation });
    }

    // Simulation of MLS + ATTOM Triangulation
    const baseValue = 325000;
    
    const mls_comps = {
      sold_price_avg: baseValue + (Math.random() * 20000 - 10000),
      beds: 3,
      baths: 2,
      sqft: 1850,
      days_on_market: 14,
      list_to_sale_ratio: 0.98,
      subdivision: 'Sunset Meadows',
      comp_count: 5
    };

    const ml_adjustments = {
      lot_size: 0.25,
      year_built: 2015,
      condition_proxy: 8.5,
      ownership_length: 4,
      tax_assessed_value: 280000,
      neighborhood_turnover: 12,
      school_score: 8,
      census_poverty_index: 0.05,
      price_trend_index: 1.04
    };

    // Final Intelligence Calculation
    const estimate = Math.round(mls_comps.sold_price_avg * ml_adjustments.price_trend_index);

    const newValuation = new Valuation({
      user: sessionUser?.userId,
      address,
      estimate,
      location_geo: {
        type: 'Point',
        coordinates: [lng || -97.7431, lat || 30.2672]
      },
      mls_comps,
      ml_adjustments,
      status: 'Draft',
      intelligence_score: 92
    });

    await newValuation.save();
    return successResponse(newValuation, 201);
  } catch (error: any) {
    return errorResponse('Valuation intercept failed.', 500, error.message);
  }
};
