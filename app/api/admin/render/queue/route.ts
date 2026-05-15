export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/core/database';
import RenderJob from '@/models/RenderJob';
import { successResponse, errorResponse } from '@/lib/core/apiResponse';

/**
 * GET /api/admin/render/queue
 * List all jobs in the queue.
 */
export async function GET() {
  try {
    await connectDB();
    const jobs = await RenderJob.find({}).sort({ createdAt: -1 });
    return successResponse(jobs);
  } catch (error: any) {
    return errorResponse('Failed to fetch queue.', 500, error.message);
  }
}

/**
 * POST /api/admin/render/queue
 * Add a new recipe to the queue.
 */
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const recipe = await req.json();
    const jobId = `JOB-${Math.random().toString(36).substring(7).toUpperCase()}`;

    const job = await RenderJob.create({
      jobId,
      recipe,
      status: 'PENDING'
    });

    return successResponse(job, 201);
  } catch (error: any) {
    return errorResponse('Failed to queue job.', 500, error.message);
  }
}

/**
 * DELETE /api/admin/render/queue
 * Clear or remove specific jobs.
 */
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    await connectDB();
    if (id) {
      await RenderJob.findByIdAndDelete(id);
    } else {
      await RenderJob.deleteMany({ status: { $ne: 'PROCESSING' } });
    }
    
    return successResponse({ message: 'Queue updated.' });
  } catch (error: any) {
    return errorResponse('Cleanup failed.', 500, error.message);
  }
}
