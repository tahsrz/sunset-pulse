import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/core/apiResponse';
import { getTourHotList } from '@/lib/data/tourHotList';
import { projectPublicListing } from '@/lib/data/publicInventory';

export const dynamic = 'force-dynamic';

// GET /api/properties/hot-list
export const GET = async (request: NextRequest) => {
  try {
    const limit = Number(request.nextUrl.searchParams.get('limit') || 10);
    // Tenant-specific curation remains disabled until this API receives
    // authoritative host-derived TenantContext. Never select a site from a
    // browser-supplied routing header.
    const result = await getTourHotList({ limit });
    return successResponse(result.listings.map(projectPublicListing), {
      configuredTargets: result.targets,
      unresolved: result.unresolved,
      skipped: result.skipped,
      generatedAt: result.generatedAt,
    });
  } catch (error: any) {
    return errorResponse('Failed to resolve the Tour Studio hot list.', 500, error.message);
  }
};
