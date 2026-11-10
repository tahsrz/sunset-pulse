import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Arbitrary typed times are not calendar reservations. Real booking must use
// the capability-scoped flow after an overlap-safe authority is verified.
export async function POST() {
  return NextResponse.json({
    ok: false,
    code: 'CONSULTATION_BOOKING_NOT_CONFIGURED',
    error: 'Automatic consultation booking is not available. Please request a consultation so a time can be arranged.',
  }, { status: 503, headers: { 'Cache-Control': 'private, no-store' } });
}
