import { getJamieRecap } from '@/lib/ai/jamie';
import { successResponse, errorResponse } from '@/lib/core/apiResponse';

/**
 * POST /api/jamie/recap
 * Generates an intelligence recap based on user history.
 */
export async function POST(req: Request) {
  try {
    const { history } = await req.json();
    
    const recap = await getJamieRecap(history);

    return successResponse({ recap });
  } catch (error: any) {
    console.error('Recap API Error:', error);
    return errorResponse('Recap generation failed.', 500, error.message);
  }
}
