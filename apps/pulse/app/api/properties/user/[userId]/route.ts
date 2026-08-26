export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import connectDB from '@/lib/core/database';
import Property from '@/models/Property';
import { successResponse, errorResponse, validationErrorResponse } from '@/lib/core/apiResponse';

// GET /api/properties/user/:userId
export const GET = async (request: NextRequest, { params }: { params: Promise<{ userId: string }> }) => {
  try {
    await connectDB();

    const { userId } = await params;

    if (!userId) {
      return validationErrorResponse('User ID is required');
    }

    const properties = await Property.find({ owner: userId });

    return successResponse(properties);
  } catch (error: any) {
    return errorResponse('Failed to fetch user-owned assets.', 500, error.message);
  }
};
