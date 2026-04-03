import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const LOG_PATH = path.join(process.cwd(), 'lib/ai/memory/daily_observations.log');

/**
 * POST /api/jamie/observations/log
 * Logs a complex observation to the daily log for consolidation during autoDream.
 */
export async function POST(request: Request) {
  try {
    const { region, data } = await request.json();

    if (!region || !data) {
      return NextResponse.json({ error: 'Region and Data are required.' }, { status: 400 });
    }

    const observationEntry = `[Complex Observation][Region: ${region}] ${data}\n`;
    
    // Ensure directory exists
    fs.mkdirSync(path.dirname(LOG_PATH), { recursive: true });
    
    // Append to log
    fs.appendFileSync(LOG_PATH, observationEntry);

    const savedObs = {
      id: Date.now().toString(),
      region,
      data,
      timestamp: new Date().toISOString()
    };

    return NextResponse.json(savedObs);
  } catch (error) {
    console.error('Observation Log Error:', error);
    return NextResponse.json({ error: 'Failed to log observation' }, { status: 500 });
  }
}

/**
 * GET /api/jamie/observations/active
 */
export async function GET() {
  try {
    if (!fs.existsSync(LOG_PATH)) return NextResponse.json([]);

    const logContent = fs.readFileSync(LOG_PATH, 'utf8');
    const lines = logContent.split('\n').filter(l => l.trim() && l.startsWith('[Complex Observation]'));
    
    const activeObs = lines.map((line, index) => {
      const regionMatch = line.match(/\[Region: (.*?)\]/);
      const data = line.split(']').pop()?.trim();
      return {
        id: `obs_${index}_${Buffer.from(line).toString('hex').slice(0, 8)}`,
        region: regionMatch ? regionMatch[1] : 'Unknown',
        data,
        raw: line
      };
    }).slice(-5);

    return NextResponse.json(activeObs);
  } catch (error) {
    return NextResponse.json([]);
  }
}

/**
 * DELETE /api/jamie/observations/log
 * Removes an observation from the log to prevent consolidation. Ozriel WIP
 */
export async function DELETE(request: Request) {
  try {
    const { rawLine } = await request.json();
    if (!fs.existsSync(LOG_PATH)) return NextResponse.json({ success: true });

    const logContent = fs.readFileSync(LOG_PATH, 'utf8');
    const updatedContent = logContent
      .split('\n')
      .filter(line => line.trim() !== rawLine.trim())
      .join('\n');

    fs.writeFileSync(LOG_PATH, updatedContent + '\n');
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete observation' }, { status: 500 });
  }
}
