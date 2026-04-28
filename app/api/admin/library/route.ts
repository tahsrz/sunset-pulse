import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/core/database';
import ViralAsset from '@/models/ViralAsset';
import { successResponse, errorResponse, notFoundResponse } from '@/lib/core/apiResponse';
import fs from 'fs';
import path from 'path';

/**
 * GET /api/admin/library
 * Retrieves all assets from the tactical library.
 */
export async function GET() {
  try {
    await connectDB();
    const assets = await ViralAsset.find({}).sort({ createdAt: -1 });
    return successResponse(assets);
  } catch (error: any) {
    return errorResponse('Failed to retrieve library.', 500, error.message);
  }
}

/**
 * POST /api/admin/library
 * Adds a new asset to the registry.
 */
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();
    
    if (!body.name || !body.path) {
      return errorResponse('Missing required fields: name, path.', 400);
    }

    const asset = await ViralAsset.create(body);
    return successResponse(asset, 201);
  } catch (error: any) {
    return errorResponse('Failed to register asset.', 500, error.message);
  }
}

/**
 * DELETE /api/admin/library?id=...
 * Removes an asset from the DB and optionally deletes the file.
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) return errorResponse('ID required.', 400);

    await connectDB();
    const asset = await ViralAsset.findById(id);
    
    if (!asset) return notFoundResponse('Asset');

    // Attempt to delete physical file if it's in public/videos
    const cleanPath = asset.path.startsWith('/') ? asset.path.substring(1) : asset.path;
    const filePath = path.join(process.cwd(), 'public', cleanPath);
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
        console.log(`[LIBRARY] Physical file deleted: ${filePath}`);
      } catch (fileErr) {
        console.error(`[LIBRARY] Failed to delete file: ${filePath}`, fileErr);
      }
    }

    await ViralAsset.findByIdAndDelete(id);
    return successResponse({ message: 'Asset purged from tactical library.' });

  } catch (error: any) {
    return errorResponse('Deletion failed.', 500, error.message);
  }
}
