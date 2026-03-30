import { NextResponse } from 'next/server';
import connectDB from '@/config/db'; // Ensure you have a DB connection util
import { SiteConfig } from '@/models/SiteConfig';

export async function POST(request: Request) {
  try {
    await connectDB();
    const { newBranding, agentId } = await request.json();

    // Jamie only updates the branding/hero sections
    const updatedConfig = await SiteConfig.findOneAndUpdate(
      { agentId: agentId || 'taz-realty-001' },
      { 
        $set: { 
          branding: newBranding, 
          lastModifiedBy: 'Jamie AI' 
        } 
      },
      { new: true }
    );

    return NextResponse.json({ success: true, config: updatedConfig });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Database update failed' }, { status: 500 });
  }
}