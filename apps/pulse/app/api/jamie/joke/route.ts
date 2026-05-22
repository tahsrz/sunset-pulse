import fs from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/jamie/joke
 * Returns the daily researched joke.
 */
export async function GET() {
  try {
    const jokePath = path.join(process.cwd(), 'utils/jamie/memory/daily_joke.json');
    
    if (!fs.existsSync(jokePath)) {
      return NextResponse.json({ 
        joke: "I haven't found a good real estate joke today. Why did the realtor cross the road? To get to the better-priced listing!",
        timestamp: new Date().toISOString()
      });
    }

    const data = fs.readFileSync(jokePath, 'utf8');
    const jokeData = JSON.parse(data);
    
    return NextResponse.json(jokeData);
  } catch (error: any) {
    console.error('Joke API Error:', error);
    return NextResponse.json({ error: 'Failed to retrieve daily joke.' }, { status: 500 });
  }
}
