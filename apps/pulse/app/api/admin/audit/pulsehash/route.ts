import { NextResponse } from 'next/server';
import { runPulseHashAudit } from '@/utils/security/PulseHashAudit';
import { getSessionUser } from '@/lib/core/getSessionUser';

/**
 * GET /api/admin/audit/pulsehash
 * Triggers a stress-test audit of the PulseHash signature logic.
 * RESTRICTED: Admin Only.
 */
export async function GET() {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser || sessionUser.role !== 'admin') {
      return NextResponse.json({ error: "Unauthorized. Tactical clearance required." }, { status: 403 });
    }

    // Run audit with 100k samples
    const results = runPulseHashAudit(100000);

    return NextResponse.json({
      success: true,
      results,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
