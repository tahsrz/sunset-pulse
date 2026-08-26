export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import connectDB from '@/lib/core/database';
import Property from '@/models/Property';
import { getSessionUser } from '@/lib/core/getSessionUser';
import { successResponse, errorResponse, unauthorizedResponse, notFoundResponse } from '@/lib/core/apiResponse';

import { normalizePropertyPricing } from '@/lib/core/propertyRecon';
import { getListingById } from '@/lib/data/listingRepository';

// GET /api/properties/:id
export const GET = async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  try {
    const { id } = await params;

    const property = await getListingById(id);

    if (!property) return notFoundResponse('Property Asset');

    return successResponse(normalizePropertyPricing(property));
  } catch (error: any) {
    console.error('[API_PROPERTY_GET_ERROR]', error.message);
    return errorResponse('Failed to retrieve property intel.', 500, error.message);
  }
};

// DELETE /api/properties/:id
export const DELETE = async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser || !sessionUser.userId) {
      return unauthorizedResponse();
    }

    const { userId } = sessionUser;
    await connectDB();

    const { id } = await params;
    const property = await Property.findById(id);
    if (!property) return notFoundResponse('Property Asset');

    // Verify operator ownership (delete)
    if (property.owner.toString() !== userId) {
      return errorResponse('Unauthorized: Operation restricted to asset owner.', 403);
    }

    await property.deleteOne();
    return successResponse({ message: 'Asset successfully purged from Intelligence Grid.' });
  } catch (error: any) {
    return errorResponse('Failed to execute asset purge.', 500, error.message);
  }
};

// PUT /api/properties/:id
export const PUT = async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  try {
    await connectDB();
    const sessionUser = await getSessionUser();

    if (!sessionUser || !sessionUser.userId) {
      return unauthorizedResponse();
    }

    const { id } = await params;
    const { userId } = sessionUser;
    const formData = await request.formData();

    const existingProperty = await Property.findById(id);
    if (!existingProperty) return notFoundResponse('Property Asset');

    //  Verify operator ownership (put)
    if (existingProperty.owner.toString() !== userId) {
      return errorResponse('Unauthorized: Metadata modification restricted to asset owner.', 403);
    }

    const propertyData: any = {
      type: formData.get('type'),
      name: formData.get('name'),
      description: formData.get('description'),
      location: {
        street: formData.get('location.street'),
        city: formData.get('location.city'),
        state: formData.get('location.state'),
        zipcode: formData.get('location.zipcode'),
      },
      beds: formData.get('beds'),
      baths: formData.get('baths'),
      square_feet: formData.get('square_feet'),
      amenities: formData.getAll('amenities'),
      rates: {
        weekly: formData.get('rates.weekly'),
        monthly: formData.get('rates.monthly'),
        nightly: formData.get('rates.nightly'),
      },
      seller_info: {
        name: formData.get('seller_info.name'),
        email: formData.get('seller_info.email'),
        phone: formData.get('seller_info.phone'),
      },
      owner: userId,
    };

    const updatedProperty = await Property.findByIdAndUpdate(id, propertyData, { new: true });
    return successResponse({ message: 'Asset metadata updated.', property: updatedProperty });
  } catch (error: any) {
    return errorResponse('Failed to update asset metadata.', 500, error.message);
  }
};
