import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import util from 'util';

const execPromise = util.promisify(exec);

/**
 * Studio API v1.0
 * Handles direct audio uploads and initiates a production render.
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const recipeStr = formData.get('recipe') as string;

    if (!file || !recipeStr) {
      return NextResponse.json({ error: 'Missing file or recipe.' }, { status: 400 });
    }

    const recipe = JSON.parse(recipeStr);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    // 1. Save the .wav file
    const uploadsDir = path.join(process.cwd(), 'public', 'audio', 'uploads');
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
    
    const audioFilename = `upload_${timestamp}${path.extname(file.name)}`;
    const audioPath = path.join(uploadsDir, audioFilename);
    
    const buffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(audioPath, buffer);
    
    console.log(`[STUDIO] Audio saved: ${audioPath}`);

    // 2. Update recipe with external audio path
    recipe.externalAudio = `/audio/uploads/${audioFilename}`;
    
    // 3. Save recipe for the engine
    const recipeDir = path.join(process.cwd(), 'exports', 'recipes');
    if (!fs.existsSync(recipeDir)) fs.mkdirSync(recipeDir, { recursive: true });
    
    const recipeFilename = `studio_recipe_${timestamp}.json`;
    const recipePath = path.join(recipeDir, recipeFilename);
    fs.writeFileSync(recipePath, JSON.stringify(recipe, null, 2));

    // 4. Trigger Render Engine
    const scriptPath = path.join(process.cwd(), 'scripts', 'render_engine.py');
    console.log(`[STUDIO] Starting Render Engine...`);
    
    try {
      const { stdout, stderr } = await execPromise(`python "${scriptPath}" "${recipePath}"`);
      
      const isSuccess = stdout.includes('SUCCESS');
      const mp4Path = isSuccess ? stdout.split('SUCCESS|')[1].trim() : null;
      const downloadUrl = mp4Path ? `/exports/productions/${path.basename(mp4Path)}` : null;

      return NextResponse.json({ 
        success: isSuccess, 
        message: isSuccess ? "Studio production complete." : "Render failed.",
        downloadUrl: downloadUrl,
        details: isSuccess ? null : stderr
      });

    } catch (engineError: any) {
      console.error('[STUDIO] Engine Crash:', engineError);
      return NextResponse.json({ error: 'Studio render process failed.', details: engineError.message }, { status: 500 });
    }

  } catch (error: any) {
    console.error('Studio API Error:', error);
    return NextResponse.json({ error: 'Failed to process studio request.' }, { status: 500 });
  }
}
