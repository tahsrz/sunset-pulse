export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import connectDB from '@/lib/core/database';
import Entity from '@/models/Entity';



export async function GET() {
  try {
    await connectDB();
    const entities = await Entity.find({}).lean();
    return NextResponse.json({ entities });
  } catch (error) {
    console.error('Entities List API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}