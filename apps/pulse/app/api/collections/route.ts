export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import connectDB from '@/lib/core/database';
import Property from '@/models/Property';
import { getSessionUser } from '@/lib/core/getSessionUser';
import { supabase } from '@/lib/supabase';
import { successResponse, unauthorizedResponse, errorResponse } from '@/lib/core/apiResponse';



import { unstable_cache, revalidateTag } from 'next/cache';

/**
 * Cached fetch helper for collections (Supabase folders joined with MongoDB).
 */
const getCachedCollections = (userId: string, propertyIds: string[]) => {
  return unstable_cache(
    async () => {
      await connectDB();
      const properties = await Property.find({ _id: { $in: propertyIds } }).lean();
      return JSON.parse(JSON.stringify(properties));
    },
    ['user-collections', userId, JSON.stringify(propertyIds)],
    { tags: [`collections-${userId}`] }
  )();
};

export const GET = async (req: NextRequest) => {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser || !sessionUser.userId) {
      return unauthorizedResponse();
    }

    // Fetch Collection IDs from Supabase
    const { data: collectionItems, error } = await supabase
      .from('collections')
      .select('property_id')
      .eq('user_id', sessionUser.userId);

    if (error) throw error;

    if (!collectionItems || collectionItems.length === 0) {
      return successResponse([]);
    }

    const propertyIds = collectionItems.map(item => item.property_id);

    // Fetch details through App Router cache layer
    const properties = await getCachedCollections(sessionUser.userId, propertyIds);

    return successResponse(properties);
  } catch (error: any) {
    return errorResponse('Failed to fetch your Pulse Folder.', 500, error.message);
  }
};

export const POST = async (request: NextRequest) => {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser || !sessionUser.userId) {
      return unauthorizedResponse();
    }

    const { propertyId } = await request.json();
    if (!propertyId) {
      return errorResponse('Property ID is required.', 400);
    }

    // Toggle the collection directly on Supabase
    const { data: existing, error: selectError } = await supabase
      .from('collections')
      .select('*')
      .eq('user_id', sessionUser.userId)
      .eq('property_id', propertyId)
      .maybeSingle();

    if (selectError) throw selectError;

    let message = '';
    let isSaved = false;

    if (existing) {
      const { error: deleteError } = await supabase
        .from('collections')
        .delete()
        .eq('id', existing.id);
      if (deleteError) throw deleteError;
      message = 'Property removed from saved list.';
      isSaved = false;
    } else {
      const { error: insertError } = await supabase
        .from('collections')
        .insert({ user_id: sessionUser.userId, property_id: propertyId });
      if (insertError) throw insertError;
      message = 'Property added to saved list.';
      isSaved = true;
    }

    // Invalidate collections cache on mutation
    revalidateTag(`collections-${sessionUser.userId}`);

    return successResponse({ message, isSaved });
  } catch (error: any) {
    return errorResponse('Failed to toggle collection through cache layer.', 500, error.message);
  }
};