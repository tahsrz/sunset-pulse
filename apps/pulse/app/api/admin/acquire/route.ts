export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import path from 'path';
import util from 'util';
import connectDB from '@/lib/core/database';
import ViralAsset from '@/models/ViralAsset';

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
    
    const { stdout, stderr } = await execPromise(`python "${scriptPath}" "${url}"`);

    if (stderr && !stdout.includes('SUCCESS')) {
      console.error('[ACQUIRE] Script Error:', stderr);
      return NextResponse.json({ error: 'Acquisition script failed.', details: stderr }, { status: 500 });
    }

    const isSuccess = stdout.includes('SUCCESS');
    const fullPath = isSuccess ? stdout.split('SUCCESS|')[1].trim() : null;
    const filename = fullPath ? path.basename(fullPath) : null;

    if (isSuccess && filename) {
      // 3. Register in Database
      await connectDB();
      const assetPath = `/videos/${filename}`;
      
      await ViralAsset.create({
        name: filename.replace(/_/g, ' ').replace('.mp4', ''),
        path: assetPath,
        type: 'VIDEO',
        sourceUrl: url,
        metadata: { tags: ['ACQUIRED', 'TRENDING'] }
      });
      
      console.log(`[ACQUIRE] Asset registered in DB: ${assetPath}`);
    }

    return NextResponse.json({ 
      success: isSuccess, 
      message: isSuccess ? 'Asset acquired and deployed.' : 'Acquisition failed.',
      asset: filename
    });

  } catch (error: any) {
    console.error('Acquisition API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
