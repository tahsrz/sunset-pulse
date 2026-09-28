import { randomUUID } from 'node:crypto';
import { NextRequest } from 'next/server';
import { isAuthResponse, requireSignedInUser } from '@/lib/core/routeAuth';
import { errorResponse, successResponse } from '@/lib/core/apiResponse';
import { appendPropertyScanAssets, readPropertyScanSession } from '@/lib/scans/propertyScanStore';
import { hasSupportedPropertyScanSignature, propertyScanAssetLimits, propertyScanAssetMimeTypes, propertyScanAssetSchema } from '@/lib/scans/propertyScanContract';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest, { params }: { params: Promise<{ scanId: string }> }) {
  const access = await requireSignedInUser(request);
  if (isAuthResponse(access)) return access;
  const { scanId } = await params;
  const session = await readPropertyScanSession(scanId, access.user.id);
  if (!session) return errorResponse('Private scan session not found.', 404);
  if (process.env.NEXT_PUBLIC_MOCK_MODE !== 'true' && !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return errorResponse('Private capture storage is not configured.', 503);
  }

  const formData = await request.formData();
  const expectedRevision = Number(formData.get('expectedRevision'));
  if (!Number.isInteger(expectedRevision) || expectedRevision < 1) return errorResponse('The capture session revision is required. Refresh the session and retry.', 400);
  const files = formData.getAll('files').filter((entry): entry is File => entry instanceof File);
  if (!files.length) return errorResponse('Add at least one photo or video capture.', 400);
  if (files.length > propertyScanAssetLimits.maxFiles) return errorResponse(`Upload no more than ${propertyScanAssetLimits.maxFiles} files at a time.`, 400);

  const preparedFiles: Array<{ file: File; bytes: Uint8Array }> = [];
  for (const file of files) {
    if (!propertyScanAssetMimeTypes.has(file.type)) return errorResponse(`${file.name} is not a supported image or video format.`, 400);
    if (file.size <= 0) return errorResponse(`${file.name} is empty and cannot be uploaded.`, 400);
    if (file.size > propertyScanAssetLimits.maxBytesPerFile) return errorResponse(`${file.name} exceeds the 75 MB capture limit.`, 400);
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (!hasSupportedPropertyScanSignature(file.type, bytes)) return errorResponse(`${file.name} content does not match its declared media type.`, 400);
    preparedFiles.push({ file, bytes });
  }

  const storage = supabaseAdmin.storage.from('property-scans');
  const uploadedPaths: string[] = [];
  const assets = [];
  for (const { file, bytes } of preparedFiles) {
    const storagePath = `${access.user.id}/${scanId}/${randomUUID()}-${safeFileName(file.name)}`;
    uploadedPaths.push(storagePath);
    const { error } = await storage.upload(storagePath, Buffer.from(bytes), { contentType: file.type, upsert: false });
    if (error) {
      await removeUploadedPaths(storage, uploadedPaths);
      return errorResponse('Capture upload failed. No public listing asset was created.', 502, error.message);
    }

    assets.push(propertyScanAssetSchema.parse({
      assetId: randomUUID(),
      path: storagePath,
      fileName: file.name,
      mimeType: file.type,
      size: file.size,
      capturedAt: null,
      uploadedAt: new Date().toISOString(),
    }));
  }

  const updated = await appendPropertyScanAssets(scanId, access.user.id, assets, expectedRevision);
  if (!updated) {
    await removeUploadedPaths(storage, uploadedPaths);
    return errorResponse('Private scan session disappeared while saving the capture manifest.', 409);
  }
  return successResponse({ endpoint: `/api/property-scans/${scanId}/assets`, session: updated, uploaded: assets.length });
}

async function removeUploadedPaths(storage: { remove: (paths: string[]) => Promise<unknown> }, paths: string[]) {
  if (!paths.length) return;
  try {
    await storage.remove(paths);
  } catch {
    // Cleanup is retried by the storage reconciliation job once reservations exist.
  }
}

function safeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, '-').slice(-160) || 'capture';
}
