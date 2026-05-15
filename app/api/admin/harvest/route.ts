export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import connectDB from '@/lib/core/database';
import ViralAsset from '@/models/ViralAsset';

/**
 * Trend Harvester API v3.0 (Database Synced)
 * Scans filesystem and synchronizes with ViralAsset database collection.
 */
export async function POST() {
  try {
    await connectDB();
    const videoDir = path.join(process.cwd(), 'public/videos');
    
    if (!fs.existsSync(videoDir)) {
      return NextResponse.json({ success: false, message: "Video directory not found." });
    }

    const files = fs.readdirSync(videoDir);
    const videoFiles = files.filter(file => 
      file.endsWith('.mp4') || file.endsWith('.webm') || file.endsWith('.mov')
    );

    // 1. Get existing paths from DB to avoid duplicates
    const existingAssets = await ViralAsset.find({ type: 'VIDEO' });
    const existingPaths = new Set(existingAssets.map(a => a.path));

    // 2. Identify and register new files
    const newAssets = [];
    for (const filename of videoFiles) {
      const assetPath = `/videos/${filename}`;
      
      if (!existingPaths.has(assetPath)) {
        const charCodeSum = filename.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        
        const newAsset = {
          name: filename.replace(/_/g, ' ').replace('.mp4', ''),
          path: assetPath,
          type: 'VIDEO',
          vibe: charCodeSum % 2 === 0 ? 'Tactical_Overlay' : 'Deep_Scan',
          autoMask: {
            maskRadius: 40 + (charCodeSum % 30),
            maskFeather: 10 + (charCodeSum % 20),
            scale: 1.1 + ((charCodeSum % 10) / 10),
            brightness: 100 + (charCodeSum % 50),
            x: (charCodeSum % 40) - 20,
            y: (charCodeSum % 20) - 10
          },
          metadata: { tags: ['SYNCED', 'LOCAL'] }
        };
        newAssets.push(newAsset);
      }
    }

    if (newAssets.length > 0) {
      await ViralAsset.insertMany(newAssets);
      console.log(`[HARVEST] Registered ${newAssets.length} new local assets.`);
    }

    // 3. Return the full synchronized library
    const fullLibrary = await ViralAsset.find({ type: 'VIDEO' }).sort({ createdAt: -1 });

    return NextResponse.json({ 
      success: true, 
      discovered: fullLibrary,
      newCount: newAssets.length,
      totalCount: fullLibrary.length,
      message: `Synchronized ${fullLibrary.length} assets.`
    });

  } catch (error) {
    console.error('Harvest API Error:', error);
    return NextResponse.json({ error: 'Failed to synchronize library.' }, { status: 500 });
  }
}
