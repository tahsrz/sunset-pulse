import { getJamieActivityRecap } from '@/lib/ai/jamie';
import { successResponse, errorResponse } from '@/lib/core/apiResponse';

/**
 * POST /api/jamie/recap
 * Generates an activity recap based on user history WIP
 */
export async function POST(req: Request) {
  try {
    const { history, coreInsights, activityLogs } = await req.json();
    
    const recap = await getJamieActivityRecap(history, coreInsights, activityLogs);

    return successResponse({ recap });
  } catch (error: any) {
    console.error('Recap API Error:', error);
    return errorResponse('Recap generation failed.', 500, error.message);
  }
}
