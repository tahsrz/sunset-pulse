import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const configPath = path.join(process.cwd(), 'config', 'marketing_copy.json');

export async function GET() {
  try {
    const fileContent = fs.readFileSync(configPath, 'utf8');
    const data = JSON.parse(fileContent);
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to read marketing config' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const newData = await request.json();
    fs.writeFileSync(configPath, JSON.stringify(newData, null, 2), 'utf8');
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update marketing config' }, { status: 500 });
  }
}
