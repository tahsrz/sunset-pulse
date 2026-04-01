import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

/**
 * GET /api/jamie/dreams
 * Returns Jamie's Spatial Intelligence (scraped business data converted into map insights)
 */
export async function GET() {
  try {
    const dreamsPath = path.join(process.cwd(), 'utils/jamie/memory/spatial_dreams.json');
    
    if (!fs.existsSync(dreamsPath)) {
      return NextResponse.json([]);
    }

    const data = fs.readFileSync(dreamsPath, 'utf8');
    const dreams = JSON.parse(data);

    return NextResponse.json(dreams);
  } catch (error) {
    console.error('Fetch Dreams Error:', error);
    return NextResponse.json({ error: 'Failed to fetch Jamie insights' }, { status: 500 });
  }
}
