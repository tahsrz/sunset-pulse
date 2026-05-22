import { NextResponse } from 'next/server';
import { purifyText } from '@/lib/ai/purifier';

/**
 * Ozriel's Scythe Purifier Engine v2.1
 * Features: Entropy Mitigation, Density Scoring, Domain Weighting.
 * Refactored to use shared purifier library.
 */

export async function POST(req: Request) {
  try {
    const { text } = await req.json();
    const result = await purifyText(text);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Purify API Error:', error);
    return NextResponse.json({ error: 'Failed to process purification.' }, { status: 500 });
  }
}
