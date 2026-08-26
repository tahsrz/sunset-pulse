import { NextResponse } from 'next/server';
import { pulse_search } from '@/lib/ai/brain/pulse_query';
import { syncUniversalIntelligence } from '@/lib/ai/brain/remote_atlas';

/**
 * POST /api/intelligence/pulse
 * Production endpoint for Jamie's Brain.
 * Bridges Vercel (Frontend) with Supabase (Storage) and TAH (Engine).
 */
export async function POST(request: Request) {
  try {
    const { query, sync = false } = await request.json();

    if (!query) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    // 1. Optional: Sync from Supabase Storage (Ensures Vercel has latest cartridges)
    if (sync) {
      console.log("[Intelligence_Pulse] Triggering Cloud Sync...");
      await syncUniversalIntelligence();
    }

    // 2. Perform Pulse Search across local/tmp cartridges
    // We'll need to modify pulse_search to also look in /tmp for Vercel support
    const results = await pulse_search(query);

    return NextResponse.json({
      success: true,
      query,
      results,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error("[Intelligence_Pulse_ERROR]", error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || "Intelligence stream interrupted." 
    }, { status: 500 });
  }
}
