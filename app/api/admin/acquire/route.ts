import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import path from 'path';
import util from 'util';

const execPromise = util.promisify(exec);

/**
 * Acquisition API
 * Triggers the Python Acquisition Service to download a video from a URL.
 */
export async function POST(req: Request) {
  try {
    const { url } = await req.json();

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    const scriptPath = path.join(process.cwd(), 'scripts/acquisition_service.py');
    
    // Execute the Python script
    console.log(`[ACQUIRE] Triggering download for: ${url}`);
    
    // We run it in the background if it's a long video, but for now we'll wait 
    // to give the user immediate feedback if it's a short clip.
    const { stdout, stderr } = await execPromise(`python "${scriptPath}" "${url}"`);

    if (stderr && !stdout.includes('SUCCESS')) {
      console.error('[ACQUIRE] Script Error:', stderr);
      return NextResponse.json({ error: 'Acquisition script failed.', details: stderr }, { status: 500 });
    }

    const isSuccess = stdout.includes('SUCCESS');
    const filename = isSuccess ? stdout.split('SUCCESS|')[1].trim() : null;

    return NextResponse.json({ 
      success: isSuccess, 
      message: isSuccess ? 'Asset acquired and deployed.' : 'Acquisition failed.',
      asset: filename ? path.basename(filename) : null
    });

  } catch (error: any) {
    console.error('Acquisition API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
