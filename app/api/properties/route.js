import { getProperties } from '@/lib/core/propertyRecon';
import { getSessionUser } from '@/lib/core/getSessionUser';
import cloudinary from '@/config/cloudinary';
import { successResponse, errorResponse, unauthorizedResponse } from '@/lib/core/apiResponse';
import Property from '@/models/Property';
import connectDB from '@/lib/core/database';

// GET /api/properties
export const GET = async (request) => {
  try {
    const page = request.nextUrl.searchParams.get('page') || 1;
    const pageSize = request.nextUrl.searchParams.get('pageSize') || 6;

    const data = await getProperties({ page: parseInt(page), pageSize: parseInt(pageSize) });

    return successResponse(data);
  } catch (error) {
    return errorResponse('Failed to fetch property intelligence.', 500, error.message);
  }
};

export const POST = async (request) => {
  try {
    await connectDB();
    const sessionUser = await getSessionUser();

    if (!sessionUser || !sessionUser.userId) {
      return unauthorizedResponse();
    }

    const { userId } = sessionUser;
    const formData = await request.formData();

    const amenities = formData.getAll('amenities');
    const images = formData.getAll('images').filter((image) => image.name !== '');

    const propertyData = {
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
      amenities,
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

    //  Image Upload Protocol
    const imageUploadPromises = images.map(async (image) => {
      const imageBuffer = await image.arrayBuffer();
      const imageArray = Array.from(new Uint8Array(imageBuffer));
      const imageData = Buffer.from(imageArray);
      const imageBase64 = imageData.toString('base64');

      const result = await cloudinary.uploader.upload(
        `data:image/png;base64,${imageBase64}`,
        { folder: 'propertypulse' }
      );
      return result.secure_url;
    });

    const uploadedImages = await Promise.all(imageUploadPromises);
    propertyData.images = uploadedImages;

    const newProperty = new Property(propertyData);
    await newProperty.save();

    return successResponse({ 
      message: 'Asset captured on Intelligence Grid.', 
      id: newProperty._id,
      url: `${process.env.NEXTAUTH_URL}/properties/${newProperty._id}` 
    }, 201);

  } catch (error) {
    return errorResponse('Critical failure in asset deployment.', 500, error.message);
  }
};
