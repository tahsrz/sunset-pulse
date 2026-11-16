import { createHash } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import type { NextRequest } from 'next/server';
import cloudinary from '@/config/cloudinary';
import { errorResponse, successResponse } from '@/lib/core/apiResponse';
import { isAuthResponse, requireOperatorRouteAccess } from '@/lib/core/routeAuth';
import { buildEditedListing, listingEditorSchema, listingEditorValues, listingMlsIdSchema } from '@/lib/data/listingEditor';
import { getCanonicalListingForEdit, upsertCanonicalListing } from '@/lib/data/listingRepository';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const maxPhotoBytes = 3 * 1024 * 1024;

export async function GET(request: NextRequest) {
  const access = await requireOperatorRouteAccess(request);
  if (isAuthResponse(access)) return access;
  const parsed = listingMlsIdSchema.safeParse(request.nextUrl.searchParams.get('mlsId'));
  if (!parsed.success) return errorResponse('Enter a valid MLS ID.', 400);
  try {
    const stored = await getCanonicalListingForEdit(parsed.data);
    if (!stored) return errorResponse('No listing was found for that MLS ID.', 404);
    if (stored.archived) return errorResponse('This MLS ID belongs to an archived listing.', 409);
    return successResponse(listingEditorValues(stored.listing));
  } catch {
    return errorResponse('Unable to load the listing.');
  }
}

export async function PUT(request: NextRequest) {
  const access = await requireOperatorRouteAccess(request);
  if (isAuthResponse(access)) return access;
  if (Number(request.headers.get('content-length')) > maxPhotoBytes + 65_536) {
    return errorResponse('The listing photo must be 3 MB or smaller.', 413);
  }
  const form = await request.formData().catch(() => null);
  if (!form) return errorResponse('The listing form could not be read.', 400);

  const parsed = listingEditorSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return errorResponse(parsed.error.issues[0]?.message || 'Check the listing details.', 400);
  const fields = parsed.data;
  const photo = form.get('photo');
  const file = photo && typeof photo !== 'string' && photo.size > 0 ? photo : null;
  if (file && file.size > maxPhotoBytes) return errorResponse('The listing photo must be 3 MB or smaller.', 413);
  try {
    const stored = await getCanonicalListingForEdit(fields.mls_id);
    if (stored?.archived) return errorResponse('This MLS ID belongs to an archived listing.', 409);

    const images = [...fields.photo_urls];
    if (file) {
      const bytes = Buffer.from(await file.arrayBuffer());
      const imageType = photoType(bytes);
      if (!imageType) return errorResponse('Choose a JPG, PNG, or WebP photo.', 400);
      const digest = createHash('sha256').update(bytes).digest('hex').slice(0, 20);
      const uploaded = await cloudinary.uploader.upload(`data:image/${imageType};base64,${bytes.toString('base64')}`, {
        folder: 'propertypulse',
        public_id: `listing-${fields.mls_id}-${digest}`,
        resource_type: 'image',
      }).catch(() => null);
      if (!uploaded?.secure_url) return errorResponse('Could not upload the photo. Try again or enter a photo URL.', 502);
      images.unshift(uploaded.secure_url);
    }

    const listing = await upsertCanonicalListing(buildEditedListing(fields, [...new Set(images)], stored?.listing));
    revalidatePath('/');
    revalidatePath('/api/properties');
    return successResponse(listingEditorValues(listing), stored ? 200 : 201);
  } catch {
    return errorResponse('Unable to save the listing.');
  }
}

function photoType(bytes: Buffer): 'jpeg' | 'png' | 'webp' | null {
  if (bytes.subarray(0, 3).toString('hex') === 'ffd8ff') return 'jpeg';
  if (bytes.subarray(0, 8).toString('hex') === '89504e470d0a1a0a') return 'png';
  if (bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP') return 'webp';
  return null;
}
