import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { isNextDynamicServerUsage } from '@/lib/core/nextDynamicError';

/**
 * GET /api/identity/verify?username=...
 * Performs a definitive database check for username availability.
 * Supports mock-mode isolation.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const username = searchParams.get('username');

  if (!username) {
    return NextResponse.json({ success: false, error: "Username is required" }, { status: 400 });
  }

  try {
    // Mock Mode Interception
    if (process.env.NEXT_PUBLIC_MOCK_MODE === 'true') {
      const taken = ['admin', 'taz', 'jamie', 'user'];
      const isTaken = taken.includes(username.toLowerCase());
      return NextResponse.json({
        success: true,
        username,
        isAvailable: !isTaken,
        isDefinitive: true,
        timestamp: new Date().toISOString()
      });
    }

    const supabase = createClient();
    
    // Check for existence in public.profiles
    const { data, error } = await supabase
      .from('profiles')
      .select('username')
      .eq('username', username.toLowerCase())
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 is "No rows found"
      throw error;
    }

    const isTaken = !!data;

    return NextResponse.json({
      success: true,
      username,
      isAvailable: !isTaken,
      isDefinitive: true,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    if (isNextDynamicServerUsage(error)) {
      return NextResponse.json({
        success: false,
        error: "Verification requires a live request context."
      }, { status: 503 });
    }

    console.error("[IDENTITY_VERIFY_ERROR]", error);
    return NextResponse.json({ 
      success: false, 
      error: "Verification stream interrupted. Jamie is checking the grid manually." 
    }, { status: 500 });
  }
}
