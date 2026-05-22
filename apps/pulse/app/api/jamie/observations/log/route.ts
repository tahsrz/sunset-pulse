import { successResponse, errorResponse } from '@/lib/core/apiResponse';
import { promises as fs } from 'fs';
import path from 'path';

const LOG_PATH = path.join(process.cwd(), 'lib/ai/memory/daily_observations.log');

/**
 * Helper to ensure the log directory exists
 * WIP REMEMBER TO CONNECT THIS
 */
async function ensureDirectory() {
  const dir = path.dirname(LOG_PATH);
  await fs.mkdir(dir, { recursive: true });
}

/**
 * POST /api/jamie/observations/log
 * Logs a complex observation with a unique ID for precise management
 */
export async function POST(request: Request) {
  try {
    const { region, data } = await request.json();

    if (!region || !data) {
      return errorResponse('Region and Data are required.', 400);
    }

    const id = Date.now().toString(36) + Math.random().toString(36).substring(2, 5);
    const timestamp = new Date().toISOString();
    
    // Structured entry: [ID][Timestamp][Region] Data
    const observationEntry = `[ID: ${id}][TS: ${timestamp}][Region: ${region}] ${JSON.stringify(data)}\n`;
    
    await ensureDirectory();
    await fs.appendFile(LOG_PATH, observationEntry, 'utf8');

    return successResponse({ id, region, data, timestamp });
  } catch (error: any) {
    console.error('Observation Log Error:', error);
    return errorResponse('Failed to log observation', 500, error.message);
  }
}

/**
 * GET /api/jamie/observations/active
 * Retrieves the most recent 5 observations.
 */
export async function GET() {
  try {
    try {
      await fs.access(LOG_PATH);
    } catch {
      return successResponse([]); // File doesn't exist yet
    }

    const logContent = await fs.readFile(LOG_PATH, 'utf8');
    const lines = logContent.split('\n').filter(l => l.trim().startsWith('[ID:'));
    
    const activeObs = lines.map((line) => {
      const idMatch = line.match(/\[ID: (.*?)\]/);
      const tsMatch = line.match(/\[TS: (.*?)\]/);
      const regionMatch = line.match(/\[Region: (.*?)\]/);
      const dataString = line.split(']').pop()?.trim();

      return {
        id: idMatch ? idMatch[1] : 'unknown',
        timestamp: tsMatch ? tsMatch[1] : null,
        region: regionMatch ? regionMatch[1] : 'Unknown',
        data: dataString,
        raw: line
      };
    }).slice(-5);

    return successResponse(activeObs);
  } catch (error: any) {
    console.error('GET Observation Error:', error);
    return errorResponse('Failed to fetch observations', 500);
  }
}

/**
 * DELETE /api/jamie/observations/log
 * Removes a specific observation by its unique raw string or ID.
 */
export async function DELETE(request: Request) {
  try {
    const { rawLine } = await request.json();
    
    try {
      await fs.access(LOG_PATH);
    } catch {
      return successResponse({ success: true });
    }

    const logContent = await fs.readFile(LOG_PATH, 'utf8');
    const lines = logContent.split('\n');
    
    // Filter out the specific line
    const updatedContent = lines
      .filter(line => line.trim() !== rawLine.trim())
      .join('\n');

    await fs.writeFile(LOG_PATH, updatedContent.trim() + '\n', 'utf8');
    
    return successResponse({ success: true });
  } catch (error: any) {
    return errorResponse('Failed to delete observation', 500, error.message);
  }
}
