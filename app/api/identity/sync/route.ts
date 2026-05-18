import { NextResponse } from 'next/server';
import { IdentityBloomFilter } from '@/utils/security/IdentityBloomFilter';
import { createClient } from '@/utils/supabase/server';
import { isNextDynamicServerUsage } from '@/lib/core/nextDynamicError';

/**
 * Generates a fresh Bloom Filter from the database.
 * This should be run after significant user growth.
 */
export async function GET() {
  try {
    const supabase = createClient();

    // 1. Initialize Filter (Size 100k, 7 Probability Loops)
    const filter = new IdentityBloomFilter(100000, 7);

    // 2. Fetch all usernames from public.profiles
    const { data: users, error } = await supabase
      .from('profiles')
      .select('username');

    if (error) throw error;
    
    if (users) {
      users.forEach(u => {
        if (u.username) filter.add(u.username);
      });
    }

    // 3. Export as Base64 for client consumption
    const payload = filter.export();

    return NextResponse.json({
      success: true,
      data: payload,
      config: { size: 100000, hashCount: 7 },
      userCount: users?.length || 0,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    if (isNextDynamicServerUsage(error)) {
      return NextResponse.json({ success: false, error: 'Dynamic identity sync requires a request context.' }, { status: 503 });
    }

    console.error("[IDENTITY_SYNC_ERROR]", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
