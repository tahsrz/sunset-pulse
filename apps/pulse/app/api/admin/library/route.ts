export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/core/database';
import ViralAsset from '@/models/ViralAsset';
import { successResponse, errorResponse, notFoundResponse } from '@/lib/core/apiResponse';
import fs from 'fs';
import path from 'path';
import { isAuthResponse, requireOperatorRouteAccess } from '@/lib/core/routeAuth';
import { z } from 'zod';

const assetSchema = z.object({
  name: z.string().trim().min(1).max(200),
  path: z.string().trim().min(1).max(500),
  type: z.string().trim().max(80).optional(),
}).strict();



/**
 * GET /api/admin/library
 * Retrieves all assets from the tactical library.
 */
export async function GET(req: NextRequest) {
  try {
    const access = await requireOperatorRouteAccess(req);
    if (isAuthResponse(access)) return access;
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
    const access = await requireOperatorRouteAccess(req);
    if (isAuthResponse(access)) return access;
    await connectDB();
    const parsed = assetSchema.safeParse(await req.json());
    if (!parsed.success) return errorResponse('Invalid library asset.', 400, parsed.error.flatten());

    const asset = await ViralAsset.create(parsed.data);
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
    const access = await requireOperatorRouteAccess(request);
    if (isAuthResponse(access)) return access;
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
