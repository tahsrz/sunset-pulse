import fs from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';

/**
 * GET /api/jamie/briefing
 * Returns the daily 5-hour research sprint results.
 */
export async function GET() {
  try {
    const briefingPath = path.join(process.cwd(), 'utils/jamie/memory/daily_briefing.json');
    
    if (!fs.existsSync(briefingPath)) {
      return NextResponse.json({ 
        error: 'No briefing found for today. Run autoDream to generate research.',
        timestamp: new Date().toISOString()
      }, { status: 404 });
    }

    const data = fs.readFileSync(briefingPath, 'utf8');
    const briefingData = JSON.parse(data);
    
    return NextResponse.json(briefingData);
  } catch (error: any) {
    console.error('Briefing API Error:', error);
    return NextResponse.json({ error: 'Failed to retrieve daily briefing.' }, { status: 500 });
  }
}
