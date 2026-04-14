import { NextRequest } from 'next/server';
import connectDB from '@/lib/core/database';
import MenuItem from '@/models/MenuItem';
import { successResponse, errorResponse } from '@/lib/core/apiResponse';

export const GET = async (request: NextRequest) => {
  try {
    await connectDB();
    const menuItems = await MenuItem.find({});
    return successResponse(menuItems);
  } catch (error: any) {
    return errorResponse('Failed to retrieve menu data.', 500, error.message);
  }
};
