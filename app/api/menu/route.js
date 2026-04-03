import connectDB from '@/lib/core/database';
import MenuItem from '@/models/MenuItem';
import { successResponse, errorResponse } from '@/lib/core/apiResponse';

export const GET = async (request) => {
  try {
    await connectDB();
    const menuItems = await MenuItem.find({});
    return successResponse(menuItems);
  } catch (error) {
    return errorResponse('Failed to retrieve menu data.', 500, error.message);
  }
};
