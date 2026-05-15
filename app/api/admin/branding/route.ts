export const dynamic = 'force-dynamic';
import connectDB from '@/lib/core/database';
import { SiteConfig } from '@/models/SiteConfig';
import { successResponse, errorResponse } from '@/lib/core/apiResponse';

export async function POST(req: Request) {
  try {
    await connectDB();
    const body = await req.json();
    const { branding } = body;

    if (!branding) {
      return errorResponse('Branding data is required', 400);
    }

    await SiteConfig.findOneAndUpdate(
      { agentId: 'taz-realty-001' },
      { 
        branding,
        lastModifiedBy: 'Admin'
      },
      { upsert: true }
    );

    return successResponse({ success: true });
  } catch (error: any) {
    console.error('[BRANDING_UPDATE_ERROR]', error);
    return errorResponse('Failed to update branding', 500, error.message);
  }
}
