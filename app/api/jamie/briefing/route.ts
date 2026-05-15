import fs from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { normalizeJamieBriefing } from '@/lib/types/jamieBriefing';

export const dynamic = 'force-dynamic';

/**
 * GET /api/jamie/briefing
 * Returns the daily 5-hour research sprint results.
 * Prioritizes Supabase (Long-Term Memory), falls back to local JSON.
 */
export async function GET() {
  try {
    // 1. Try fetching from Supabase first
    const { data: dbBriefing, error: dbError } = await supabase
      .from('daily_briefings')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (!dbError && dbBriefing) {
      console.log('Briefing retrieved from Supabase.');
      return NextResponse.json(normalizeJamieBriefing(dbBriefing));
    }

    // 2. Fallback to local JSON
    const briefingPath = path.join(process.cwd(), 'utils/jamie/memory/daily_briefing.json');
    
    if (fs.existsSync(briefingPath)) {
      console.log('Briefing retrieved from local cache.');
      const data = fs.readFileSync(briefingPath, 'utf8');
      return NextResponse.json(normalizeJamieBriefing(JSON.parse(data)));
    }

    return NextResponse.json({ 
      error: 'No briefing found. Run autoDream to generate research.',
      timestamp: new Date().toISOString()
    }, { status: 404 });

  } catch (error: any) {
    console.error('Briefing API Error:', error);
    return NextResponse.json({ error: 'Failed to retrieve daily briefing.' }, { status: 500 });
  }
}
