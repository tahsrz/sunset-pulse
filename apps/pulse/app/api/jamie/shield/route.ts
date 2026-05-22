import { GuardianBridge } from '@/lib/security/guardianBridge';
import { successResponse, errorResponse } from '@/lib/core/apiResponse';

/**
 * API Route: /api/jamie/shield
 * POST: Scans user input for security patterns.
 */
export async function POST(request: Request) {
  try {
    const { query } = await request.json();

    if (!query) {
      return errorResponse('Query parameter required.', 400);
    }

    // Security Analysis
    const analysis = GuardianBridge.scan(query);

    return successResponse(analysis);
  } catch (error) {
    return errorResponse('Internal security scan failure.', 500, error.message);
  }
}
