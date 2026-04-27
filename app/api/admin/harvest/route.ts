import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

/**
 * Trend Harvester API v2.0
 * Dynamically scans the filesystem for new assets and generates extraction metadata.
 */
export async function POST() {
  try {
    const videoDir = path.join(process.cwd(), 'public/videos');
    
    // 1. Scan the directory for physical files
    if (!fs.existsSync(videoDir)) {
      return NextResponse.json({ success: false, message: "Video directory not found." });
    }

    const files = fs.readdirSync(videoDir);
    const videoFiles = files.filter(file => 
      file.endsWith('.mp4') || file.endsWith('.webm') || file.endsWith('.mov')
    );

    // 2. Map files to trending objects with randomized extraction profiles
    const trendingClips = videoFiles.map((filename, index) => {
      // Create a deterministic but varied mask based on the filename
      const charCodeSum = filename.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      
      return {
        id: `fs-trend-${index}-${Math.random().toString(36).substring(7)}`,
        name: filename.replace(/_/g, ' ').replace('.mp4', ''),
        path: `/videos/${filename}`,
        vibe: index % 2 === 0 ? 'Tactical_Overlay' : 'Deep_Scan',
        autoMask: {
          maskRadius: 40 + (charCodeSum % 30), // Varies 40-70
          maskFeather: 10 + (charCodeSum % 20), // Varies 10-30
          scale: 1.1 + ((charCodeSum % 10) / 10), // Varies 1.1 - 2.0
          brightness: 100 + (charCodeSum % 50),
          x: (charCodeSum % 40) - 20, // Randomish start position
          y: (charCodeSum % 20) - 10
        }
      };
    });

    return NextResponse.json({ 
      success: true, 
      discovered: trendingClips,
      count: trendingClips.length,
      message: `Successfully discovered ${trendingClips.length} assets from local storage.`
    });

  } catch (error) {
    console.error('Harvest API Error:', error);
    return NextResponse.json({ error: 'Failed to scan for trends.' }, { status: 500 });
  }
}
