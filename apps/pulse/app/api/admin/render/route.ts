import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import util from 'util';

const execPromise = util.promisify(exec);

/**
 * Render Engine API v2.0
 * Converts production recipes into final MP4 videos using FFmpeg and Python.
 */
export async function POST(req: Request) {
  try {
    const recipe = await req.json();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `recipe_${timestamp}.json`;
    
    // 1. Save the recipe for the engine to read
    const recipeDir = path.join(process.cwd(), 'exports', 'recipes');
    if (!fs.existsSync(recipeDir)) fs.mkdirSync(recipeDir, { recursive: true });
    
    const recipePath = path.join(recipeDir, filename);
    fs.writeFileSync(recipePath, JSON.stringify(recipe, null, 2));

    console.log(`[RENDER] Recipe saved: ${recipePath}`);

    // 2. Trigger the Render Engine (Python + FFmpeg)
    const scriptPath = path.join(process.cwd(), 'scripts', 'render_engine.py');
    
    // We execute the engine. This might take a while depending on video length.
    // In a production environment, this should be a background queue.
    console.log(`[RENDER] Starting Engine...`);
    
    try {
      const { stdout, stderr } = await execPromise(`python "${scriptPath}" "${recipePath}"`);
      
      if (stderr && !stdout.includes('SUCCESS')) {
        console.error('[RENDER] Engine Error:', stderr);
        return NextResponse.json({ error: 'Render Engine failed.', details: stderr }, { status: 500 });
      }

      const isSuccess = stdout.includes('SUCCESS');
      const mp4Path = isSuccess ? stdout.split('SUCCESS|')[1].trim() : null;
      const downloadUrl = mp4Path ? `/exports/productions/${path.basename(mp4Path)}` : null;

      return NextResponse.json({ 
        success: isSuccess, 
        message: isSuccess ? "Production rendered successfully." : "Render failed.",
        recipe: filename,
        downloadUrl: downloadUrl
      });

    } catch (engineError: any) {
      console.error('[RENDER] Execution Exception:', engineError);
      return NextResponse.json({ error: 'Render process crashed.', details: engineError.message }, { status: 500 });
    }

  } catch (error: any) {
    console.error('Render API Error:', error);
    return NextResponse.json({ error: 'Failed to initiate render.' }, { status: 500 });
  }
}
