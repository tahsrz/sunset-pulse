export const dynamic = 'force-dynamic';
import connectDB from '@/lib/core/database';
import { SiteConfig } from '@/models/SiteConfig';
import { successResponse, errorResponse } from '@/lib/core/apiResponse';
import { getAgentIdFromInput } from '@/lib/sites/agentConfig';

export async function POST(req: Request) {
  try {
    await connectDB();
    const body = await req.json();
    const { branding } = body;
    const agentId = getAgentIdFromInput({ agentId: body.agentId });

    if (!branding) {
      return errorResponse('Branding data is required', 400);
    }

    await SiteConfig.findOneAndUpdate(
      { agentId },
      { 
        branding,
        lastModifiedBy: 'Admin'
      },
      { upsert: true }
    );

    return successResponse({ success: true, agentId });
  } catch (error: any) {
    console.error('[BRANDING_UPDATE_ERROR]', error);
    return errorResponse('Failed to update branding', 500, error.message);
  }
}
