import { NextRequest, NextResponse } from 'next/server';
import { getYieldIntelligenceByCounty, listYieldIntelligence } from '@/lib/intelligence/yieldIntelligence';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const county = request.nextUrl.searchParams.get('county');

  if (county) {
    const record = getYieldIntelligenceByCounty(county);
    if (!record) {
      return NextResponse.json(
        { data: null, error: `No yield intelligence found for ${county}.` },
        { status: 404 },
      );
    }

    return NextResponse.json({ data: record });
  }

  return NextResponse.json({ data: listYieldIntelligence() });
}
