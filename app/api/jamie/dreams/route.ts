import fs from 'fs';
import path from 'path';
import { successResponse, errorResponse } from '@/lib/core/apiResponse';

/**
 * GET /api/jamie/dreams
 * Returns spatial data insights.
 */
export async function GET() {
  try {
    const dataPath = path.join(process.cwd(), 'lib/ai/memory/spatial_dreams.json');
    
    if (!fs.existsSync(dataPath)) {
      return successResponse([]);
    }

    const data = fs.readFileSync(dataPath, 'utf8');
    const insights = JSON.parse(data);

    return successResponse(insights);
  } catch (error) {
    return errorResponse('Failed to retrieve spatial data insights.', 500, error.message);
  }
}
