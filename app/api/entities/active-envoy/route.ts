import { NextResponse } from 'next/server';
import connectDB from '@/lib/core/database';
import Entity from '@/models/Entity';
import { SiteConfig } from '@/models/SiteConfig';

export async function GET() {
  try {
    await connectDB();

    // 1. Get the current configuration to find out who the active envoy is
    const config = await SiteConfig.findOne({ agentId: 'taz-realty-001' }).lean();
    const envoyId = (config as any)?.activeEnvoyId || 'ENVOY-JAMIE';

    // 2. Fetch the full entity details for that envoy
    const envoy = await Entity.findOne({ uid: envoyId }).lean();

    if (!envoy) {
      return NextResponse.json({ error: 'Active Envoy not found' }, { status: 404 });
    }

    return NextResponse.json({ envoy });
  } catch (error) {
    console.error('Active Envoy API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
