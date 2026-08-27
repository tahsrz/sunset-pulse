import { NextRequest, NextResponse } from 'next/server';
import { getOperatorAccess } from '@/lib/core/operator_access';
import { getRequestHostFromHeaders } from '@/lib/core/routeAuth';
import { conversionBaselineSchema } from '@/lib/profit/conversionBaseline';
import { loadConversionBaseline, persistConversionBaseline } from '@/lib/profit/conversionBaselineStore';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const access = await getOperatorAccess(request.headers.get('host'));
  if (!access.allowed) return NextResponse.json({ ok: false, error: 'Operator access required.' }, { status: 403 });
  const tenantSite = request.nextUrl.searchParams.get('site')?.trim() || getRequestHostFromHeaders(request.headers);
  if (!tenantSite) return NextResponse.json({ ok: false, error: 'Tenant site is required.' }, { status: 400 });
  try { return NextResponse.json({ ok: true, baseline: await loadConversionBaseline(tenantSite) }); }
  catch { return NextResponse.json({ ok: false, error: 'Unable to load baseline.' }, { status: 500 }); }
}

export async function POST(request: NextRequest) {
  const access = await getOperatorAccess(request.headers.get('host'));
  if (!access.allowed) return NextResponse.json({ ok: false, error: 'Operator access required.' }, { status: 403 });
  try {
    const body = await request.json() as { tenantSite?: string; windowStart?: string; windowEnd?: string; handoffPercent?: number; appointmentPercent?: number };
    const tenantSite = body.tenantSite?.trim() || getRequestHostFromHeaders(request.headers);
    if (!tenantSite || !body.windowStart || !body.windowEnd) return NextResponse.json({ ok: false, error: 'Tenant and measurement window are required.' }, { status: 400 });
    const windowStart = new Date(body.windowStart);
    const windowEnd = new Date(body.windowEnd);
    if (!Number.isFinite(windowStart.getTime()) || !Number.isFinite(windowEnd.getTime()) || windowEnd <= windowStart) return NextResponse.json({ ok: false, error: 'Measurement window must be valid and ordered.' }, { status: 400 });
    const baseline = conversionBaselineSchema.parse({ handoffPercent: body.handoffPercent, appointmentPercent: body.appointmentPercent });
    const stored = await persistConversionBaseline({ tenantSite, windowStart: windowStart.toISOString(), windowEnd: windowEnd.toISOString(), ...baseline });
    return NextResponse.json({ ok: true, baseline: stored });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Unable to persist baseline.' }, { status: 400 });
  }
}
