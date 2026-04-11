import connectDB from '@/lib/core/database';
import { SiteConfig } from '@/models/SiteConfig';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    await connectDB();
    const body = await req.json();
    const { branding } = body;

    if (!branding) {
      return NextResponse.json({ error: 'Branding data is required' }, { status: 400 });
    }

    await SiteConfig.findOneAndUpdate(
      { agentId: 'taz-realty-001' },
      { 
        branding,
        lastModifiedBy: 'Admin'
      },
      { upsert: true }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[BRANDING_UPDATE_ERROR]', error);
    return NextResponse.json({ error: 'Failed to update branding' }, { status: 500 });
  }
}
