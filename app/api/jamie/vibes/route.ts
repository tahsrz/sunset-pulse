export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import connectDB from '@/lib/core/database';
import Vibe from '@/models/Vibe';

export async function GET() {
  try {
    await connectDB();
    const vibes = await Vibe.find({}).lean();
    return NextResponse.json({ vibes });
  } catch (error) {
    console.error('Vibe Dictionary GET Error:', error);
    return NextResponse.json({ error: 'Failed to fetch vibe dictionary.' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await connectDB();
    const body = await req.json();
    
    // In a real scenario, we'd have a processing step here 
    // to extract these parameters from a video using Gemini Vision.
    // For now, we allow direct insertion into the dictionary.
    
    const vibe = await Vibe.findOneAndUpdate(
      { vibeId: body.vibeId },
      body,
      { upsert: true, new: true }
    );

    return NextResponse.json({ success: true, vibe });
  } catch (error) {
    console.error('Vibe Dictionary POST Error:', error);
    return NextResponse.json({ error: 'Failed to update vibe dictionary.' }, { status: 500 });
  }
}
