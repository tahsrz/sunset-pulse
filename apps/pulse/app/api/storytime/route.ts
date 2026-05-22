export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import connectDB from '@/lib/core/database';
import Story from '@/models/Story';

export async function GET() {
  try {
    await connectDB();
    const stories = await Story.find({}, { title: 1, uid: 1 }).lean();
    return NextResponse.json({ stories });
  } catch (error) {
    console.error('Stories List API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await connectDB();
    const body = await req.json();
    const { uid, title, originalText } = body;

    // Split text into pages by double newline or similar
    const lines = originalText.split('\n\n').filter((l: string) => l.trim() !== '');
    const pages = lines.map((text: string, index: number) => ({
      pageNumber: index + 1,
      originalText: text.trim(),
    }));

    const story = await Story.create({
      uid,
      title,
      pages
    });

    return NextResponse.json({ story });
  } catch (error) {
    console.error('Story Creation API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
