import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import path from 'path';
import util from 'util';
import connectDB from '@/lib/core/database';
import RenderJob from '@/models/RenderJob';

const execPromise = util.promisify(exec);
const scriptPath = path.join(process.cwd(), 'scripts', 'render_engine.py');

/**
 * Batch Processor API
 * Sequentially renders all pending jobs in the queue.
 */
export async function POST() {
  try {
    await connectDB();
    
    // 1. Find all pending jobs
    const pendingJobs = await RenderJob.find({ status: 'PENDING' }).sort({ createdAt: 1 });

    if (pendingJobs.length === 0) {
      return NextResponse.json({ message: 'No pending jobs in queue.' });
    }

    // 2. Process in background to avoid timeout
    // We trigger the batch processing but return immediately to the UI
    processBatch(pendingJobs);

    return NextResponse.json({ 
      success: true, 
      message: `Batch rendering started for ${pendingJobs.length} jobs.`,
      count: pendingJobs.length
    });

  } catch (error: any) {
    console.error('Batch Render Error:', error);
    return NextResponse.json({ error: 'Failed to start batch.' }, { status: 500 });
  }
}

async function processBatch(jobs: any[]) {
  console.log(`[BATCH] Starting sequential render for ${jobs.length} items...`);
  
  for (const job of jobs) {
    try {
      // Update status to processing
      await RenderJob.findByIdAndUpdate(job._id, { status: 'PROCESSING', progress: 10 });
      
      // Save recipe to temp file for the python engine
      const tempRecipePath = path.join(process.cwd(), 'exports', 'recipes', `batch_${job.jobId}.json`);
      const fs = require('fs');
      fs.writeFileSync(tempRecipePath, JSON.stringify(job.recipe, null, 2));

      console.log(`[BATCH] Rendering Job: ${job.jobId}`);
      
      const { stdout, stderr } = await execPromise(`python "${scriptPath}" "${tempRecipePath}"`);
      
      if (stdout.includes('SUCCESS')) {
        const mp4Path = stdout.split('SUCCESS|')[1].trim();
        const downloadUrl = `/exports/productions/${path.basename(mp4Path)}`;
        
        await RenderJob.findByIdAndUpdate(job._id, { 
          status: 'COMPLETED', 
          progress: 100,
          outputUrl: downloadUrl 
        });
        console.log(`[BATCH] Completed Job: ${job.jobId}`);
      } else {
        throw new Error(stderr || 'FFmpeg Engine Error');
      }

    } catch (err: any) {
      console.error(`[BATCH] Failed Job: ${job.jobId}`, err.message);
      await RenderJob.findByIdAndUpdate(job._id, { 
        status: 'FAILED', 
        error: err.message 
      });
    }
  }
  
  console.log(`[BATCH] All jobs processed.`);
}
