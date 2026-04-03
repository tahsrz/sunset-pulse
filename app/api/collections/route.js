import connectDB from '@/lib/core/database';
import Property from '@/models/Property';
import { getSessionUser } from '@/lib/core/getSessionUser';
import { supabase } from '@/lib/supabase';
import { successResponse, unauthorizedResponse, errorResponse } from '@/lib/core/apiResponse';

export const GET = async () => {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser || !sessionUser.userId) {
      return unauthorizedResponse();
    }

    // 1. Fetch Collection IDs from Supabase
    // Using user_id stringify if coming from NextAuth/Mongo
    const { data: collectionItems, error } = await supabase
      .from('collections')
      .select('property_id')
      .eq('user_id', sessionUser.userId);

    if (error) throw error;

    if (!collectionItems || collectionItems.length === 0) {
      return successResponse([]);
    }

    const propertyIds = collectionItems.map(item => item.property_id);

    // 2. Fetch full property details MongoDB
    await connectDB();
    const properties = await Property.find({ _id: { $in: propertyIds } });

    return successResponse(properties);
  } catch (error) {
    return errorResponse('Failed to fetch your Pulse Folder.', 500, error.message);
  }
};
