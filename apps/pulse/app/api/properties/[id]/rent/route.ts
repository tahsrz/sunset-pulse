export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { fetchRentEstimate } from '@/lib/data/rentcast';
import Property from '@/models/Property';
import connectDB from '@/lib/core/database';
import { successResponse, errorResponse } from '@/lib/core/apiResponse';
import { IntelligenceVault } from '@/lib/core/intelligenceVault';

/**
 * GET /api/properties/[id]/rent
 * Fetches RentCast data with 30-day Grid Persistence (legal)
 */
export const GET = async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  try {
    await connectDB();
    const { id } = await params;

    const property: any = await Property.findById(id).lean();
    if (!property) return errorResponse('Asset not found in grid.', 404);

    const address = `${property.location.street}, ${property.location.city}, ${property.location.state} ${property.location.zipcode}`;

    // Resolve via Intelligence Vault
    const rentData = await IntelligenceVault.resolve(id, 'rent', async () => {
      return await fetchRentEstimate(address);
    });

    return successResponse(rentData);
  } catch (error: any) {
    return errorResponse('Market rent reconnaissance failed.', 500, error.message);
  }
};
