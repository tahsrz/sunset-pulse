import fs from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';

/**
 * GET /api/jamie/dreams
 * Returns spatial data insights.
 */
export async function GET() {
  console.log('[DREAMS_API]: Request received');
  try {
    const primaryPath = path.join(process.cwd(), 'lib/ai/memory/spatial_dreams.json');
    const fallbackPath = path.join(process.cwd(), 'utils/jamie/memory/spatial_dreams.json');
    
    let dataPath = primaryPath;
    if (!fs.existsSync(primaryPath) && fs.existsSync(fallbackPath)) {
      dataPath = fallbackPath;
      console.log('[DREAMS_API]: Using fallback path:', dataPath);
    }
    
    console.log('[DREAMS_API]: Targeting path:', dataPath);
    
    if (!fs.existsSync(dataPath)) {
      console.warn('[DREAMS_API]: File not found at any known path');
      return NextResponse.json([]);
    }

    const data = fs.readFileSync(dataPath, 'utf8');
    console.log('[DREAMS_API]: File read successful, length:', data.length);
    
    let insights = [];
    try {
      insights = JSON.parse(data);
    } catch (parseError) {
      console.error('[DREAMS_API]: JSON Parse Error:', parseError);
      return NextResponse.json({ error: 'Data corruption detected.' }, { status: 500 });
    }
    
    console.log('[DREAMS_API]: JSON parse successful, items:', insights.length);
    return NextResponse.json(insights);
  } catch (error) {
    console.error('[DREAMS_API_FATAL]:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to retrieve spatial data insights.',
      details: error.message 
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
